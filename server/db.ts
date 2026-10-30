/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import bcrypt from 'bcryptjs';
import { Certificate, CertificateStatus, DashboardMetrics, AdminUser } from '../src/types/index.js';
import {
  connectMongoDB,
  ensureMongoConnected,
  isMongoConnected,
  getMongoHealth,
  getAllCertificatesMongo,
  getCertificateByIdMongo,
  getCertificateByVerificationIdMongo,
  getCertificateByNumberMongo,
  getNextCertificateNumberMongo,
  getAllCertificateNumbersMongo,
  insertCertificateMongo,
  updateCertificateMongo,
  revokeCertificateMongo,
  deleteCertificateMongo,
  getDashboardMetricsMongo,
  getAdminByUsernameMongo,
  getAdminByIdMongo,
  saveAdminMongo,
  syncDefaultAdminMongo,
  migrateSqliteToMongo,
} from './mongodb.js';

export { isMongoConnected, getMongoHealth, connectMongoDB, ensureMongoConnected };

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'certificates.sqlite');

let dbInstance: SqlJsDatabase | null = null;
let mongoInitAttempted = false;

/**
 * Persists the in-memory SQLite database to disk atomically
 */
export function saveDatabaseToDisk(): void {
  if (!dbInstance) return;
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const binaryArray = dbInstance.export();
  const buffer = Buffer.from(binaryArray);
  const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, buffer);
  fs.renameSync(tempPath, DB_FILE);
}

/**
 * Initializes SQLite database and connects to MongoDB Atlas if MONGODB_URI is provided.
 */
export async function getDatabase(): Promise<SqlJsDatabase> {
  // 1. Attempt MongoDB Atlas connection once at startup if MONGODB_URI is provided
  if (!mongoInitAttempted && process.env.MONGODB_URI) {
    mongoInitAttempted = true;
    try {
      await connectMongoDB();
    } catch (err) {
      console.warn('[Cosmogeek] Could not connect to MongoDB Atlas at startup:', err);
    }
  }

  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Create tables if not exist
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      certificateNumber TEXT UNIQUE NOT NULL,
      verificationId TEXT UNIQUE NOT NULL,
      recipientName TEXT NOT NULL,
      recipientEmail TEXT,
      designation TEXT NOT NULL,
      department TEXT,
      certificateType TEXT NOT NULL,
      internshipDuration TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      issuingCompany TEXT NOT NULL,
      signatoryName TEXT NOT NULL,
      signatoryRole TEXT,
      initiatorName TEXT,
      approverName TEXT,
      approverDesignation TEXT,
      issueLocation TEXT,
      additionalNotes TEXT,
      contentBody TEXT,
      status TEXT NOT NULL,
      verificationUrl TEXT,
      verificationPath TEXT NOT NULL,
      pdfPath TEXT NOT NULL,
      issuedAt TEXT NOT NULL,
      revokedAt TEXT,
      revocationReason TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cert_number ON certificates(certificateNumber);
    CREATE INDEX IF NOT EXISTS idx_cert_verification_id ON certificates(verificationId);
    CREATE INDEX IF NOT EXISTS idx_cert_status ON certificates(status);
  `);

  // Ensure department and verificationUrl columns exist in SQLite if table was created previously
  try {
    dbInstance.run('ALTER TABLE certificates ADD COLUMN department TEXT;');
  } catch {}
  try {
    dbInstance.run('ALTER TABLE certificates ADD COLUMN verificationUrl TEXT;');
  } catch {}
  try {
    dbInstance.run('ALTER TABLE certificates ADD COLUMN contentBody TEXT;');
  } catch {}

  // Synchronize or seed default admin in SQLite
  const defaultUsername = (process.env.ADMIN_DEFAULT_USERNAME || 'Anirudh Hatwar').trim();
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || '@CosmoDGeek1911';
  const now = new Date().toISOString();

  const stmtAdmin = dbInstance.prepare(
    'SELECT id, username, passwordHash FROM admins WHERE id = :id OR username = :oldUser OR LOWER(TRIM(username)) = LOWER(:newUser) LIMIT 1'
  );
  stmtAdmin.bind({ ':id': 'admin_init_1', ':oldUser': 'admin', ':newUser': defaultUsername });

  let effectiveHash = '';
  if (stmtAdmin.step()) {
    const row = stmtAdmin.getAsObject();
    stmtAdmin.free();
    const existingId = String(row.id || 'admin_init_1');
    effectiveHash = String(row.passwordHash || '');
    const usernameMatches = String(row.username).trim().toLowerCase() === defaultUsername.toLowerCase();

    let shouldUpdate = !usernameMatches;
    if (defaultPassword && !bcrypt.compareSync(defaultPassword, effectiveHash)) {
      effectiveHash = bcrypt.hashSync(defaultPassword, 10);
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      dbInstance.run(
        'UPDATE admins SET id = ?, username = ?, passwordHash = ?, updatedAt = ? WHERE id = ? OR username = ? OR LOWER(TRIM(username)) = LOWER(?)',
        ['admin_init_1', defaultUsername, effectiveHash, now, existingId, 'admin', defaultUsername]
      );
    }
  } else {
    stmtAdmin.free();
    effectiveHash = defaultPassword ? bcrypt.hashSync(defaultPassword, 10) : '';
    dbInstance.run(
      'INSERT INTO admins (id, username, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      ['admin_init_1', defaultUsername, effectiveHash, now, now]
    );
  }

  // Ensure no orphan admin records with outdated username
  if (defaultUsername.toLowerCase() !== 'admin') {
    dbInstance.run("DELETE FROM admins WHERE username = 'admin' AND id != 'admin_init_1'");
  }

  // Seed sample initial certificate from prompt if none exists
  const certCheck = dbInstance.exec('SELECT count(*) as count FROM certificates');
  const certCount = (certCheck[0]?.values[0]?.[0] as number) || 0;

  if (certCount === 0) {
    const certNumber = '#26832';
    const verificationId = 'cg-26832-7a8e';
    const verificationPath = `/verify/${verificationId}`;
    const pdfPath = `storage/certificates/26832.pdf`;

    dbInstance.run(
      `INSERT INTO certificates (
        id, certificateNumber, verificationId, recipientName, recipientEmail,
        designation, department, certificateType, internshipDuration, startDate, endDate,
        issuingCompany, signatoryName, signatoryRole, issueLocation, status,
        verificationUrl, verificationPath, pdfPath, issuedAt, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'cert_init_26832',
        certNumber,
        verificationId,
        'Yuvraj Dhumale',
        'yuvraj.dhumale@example.com',
        'Jr. Software Developer',
        'Software Engineering',
        'Certificate of Completion',
        '3 months',
        '2026-07-10',
        '2026-10-16',
        'Cosmogeek Software Solutions Pvt. Ltd.',
        'Anirudh Hatwar',
        'Director / Authorized Signatory',
        'Nagpur, Maharashtra, India',
        'VALID',
        `http://192.168.101.73:3000${verificationPath}`,
        verificationPath,
        pdfPath,
        '2026-10-16T10:00:00.000Z',
        '2026-10-16T10:00:00.000Z',
        '2026-10-16T10:00:00.000Z',
      ]
    );
  }

  saveDatabaseToDisk();

  // If MongoDB is connected, automatically sync existing SQLite certificates into MongoDB
  if (isMongoConnected()) {
    try {
      const allSqliteCerts = getAllCertificatesSqliteSync(dbInstance);
      await migrateSqliteToMongo(allSqliteCerts);

      // Also sync admin to MongoDB Atlas
      if (effectiveHash) {
        await syncDefaultAdminMongo(defaultUsername, effectiveHash);
      }
    } catch (err) {
      console.warn('[Cosmogeek] Auto-sync to MongoDB Atlas encountered an error:', err);
    }
  }

  return dbInstance;
}

/**
 * Helper to convert SQLite row object into strongly-typed Certificate
 */
function rowToCertificate(row: Record<string, any>): Certificate {
  return {
    id: String(row.id),
    certificateNumber: String(row.certificateNumber),
    verificationId: String(row.verificationId),
    recipientName: String(row.recipientName),
    recipientEmail: row.recipientEmail ? String(row.recipientEmail) : null,
    designation: String(row.designation),
    department: row.department ? String(row.department) : null,
    certificateType: String(row.certificateType),
    internshipDuration: String(row.internshipDuration),
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    issuingCompany: String(row.issuingCompany),
    signatoryName: String(row.signatoryName),
    signatoryRole: row.signatoryRole ? String(row.signatoryRole) : null,
    initiatorName: row.initiatorName ? String(row.initiatorName) : null,
    approverName: row.approverName ? String(row.approverName) : null,
    approverDesignation: row.approverDesignation ? String(row.approverDesignation) : null,
    issueLocation: row.issueLocation ? String(row.issueLocation) : null,
    additionalNotes: row.additionalNotes ? String(row.additionalNotes) : null,
    contentBody: row.contentBody ? String(row.contentBody) : null,
    status: (row.status as CertificateStatus) || 'VALID',
    verificationUrl: row.verificationUrl ? String(row.verificationUrl) : undefined,
    verificationPath: String(row.verificationPath),
    pdfPath: String(row.pdfPath),
    issuedAt: String(row.issuedAt),
    revokedAt: row.revokedAt ? String(row.revokedAt) : null,
    revocationReason: row.revocationReason ? String(row.revocationReason) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export function getAllCertificatesSqliteSync(db: SqlJsDatabase): Certificate[] {
  const stmt = db.prepare('SELECT * FROM certificates ORDER BY createdAt DESC');
  const certificates: Certificate[] = [];
  while (stmt.step()) {
    certificates.push(rowToCertificate(stmt.getAsObject()));
  }
  stmt.free();
  return certificates;
}

async function getAdminByUsernameSqlite(db: SqlJsDatabase, username: string) {
  const clean = username.trim();
  const stmt = db.prepare('SELECT * FROM admins WHERE LOWER(TRIM(username)) = LOWER(:username)');
  stmt.bind({ ':username': clean });
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: String(row.id),
      username: String(row.username),
      passwordHash: String(row.passwordHash),
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }
  stmt.free();
  return null;
}

/**
 * ----------------------------------------------------
 * UNIFIED CERTIFICATE DATA ACCESS (MongoDB + SQLite)
 * ----------------------------------------------------
 */

export async function getAllCertificates(options: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ certificates: Certificate[]; total: number }> {
  if (isMongoConnected()) {
    try {
      return await getAllCertificatesMongo(options);
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Query failed, falling back to SQLite:', err);
    }
  }

  const db = await getDatabase();
  const { search, status, limit = 50, offset = 0 } = options;

  let query = 'SELECT * FROM certificates WHERE 1=1';
  let countQuery = 'SELECT count(*) as count FROM certificates WHERE 1=1';
  const params: Record<string, unknown> = {};

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ' AND (recipientName LIKE :search OR certificateNumber LIKE :search OR designation LIKE :search OR department LIKE :search)';
    countQuery += ' AND (recipientName LIKE :search OR certificateNumber LIKE :search OR designation LIKE :search OR department LIKE :search)';
    params[':search'] = term;
  }

  if (status && (status === 'VALID' || status === 'REVOKED')) {
    query += ' AND status = :status';
    countQuery += ' AND status = :status';
    params[':status'] = status;
  }

  query += ' ORDER BY createdAt DESC LIMIT :limit OFFSET :offset';
  params[':limit'] = limit;
  params[':offset'] = offset;

  const countStmt = db.prepare(countQuery);
  if (params[':search']) {
    countStmt.bind({ ':search': params[':search'] as string, ...(params[':status'] ? { ':status': params[':status'] as string } : {}) } as any);
  } else if (params[':status']) {
    countStmt.bind({ ':status': params[':status'] as string } as any);
  }
  
  let total = 0;
  if (countStmt.step()) {
    total = (countStmt.getAsObject().count as number) || 0;
  }
  countStmt.free();

  const stmt = db.prepare(query);
  stmt.bind(params as any);
  const certificates: Certificate[] = [];
  while (stmt.step()) {
    certificates.push(rowToCertificate(stmt.getAsObject()));
  }
  stmt.free();

  return { certificates, total };
}

export async function getCertificateById(id: string): Promise<Certificate | null> {
  if (isMongoConnected()) {
    try {
      const cert = await getCertificateByIdMongo(id);
      if (cert) return cert;
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Query failed, falling back to SQLite:', err);
    }
  }

  const db = await getDatabase();
  const stmt = db.prepare('SELECT * FROM certificates WHERE id = :id');
  stmt.bind({ ':id': id });
  if (stmt.step()) {
    const cert = rowToCertificate(stmt.getAsObject());
    stmt.free();
    return cert;
  }
  stmt.free();
  return null;
}

export async function getCertificateByVerificationId(verificationId: string): Promise<Certificate | null> {
  if (isMongoConnected()) {
    try {
      const cert = await getCertificateByVerificationIdMongo(verificationId);
      if (cert) return cert;
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Query failed, falling back to SQLite:', err);
    }
  }

  const db = await getDatabase();
  const stmt = db.prepare('SELECT * FROM certificates WHERE verificationId = :verificationId');
  stmt.bind({ ':verificationId': verificationId });
  if (stmt.step()) {
    const cert = rowToCertificate(stmt.getAsObject());
    stmt.free();
    return cert;
  }
  stmt.free();
  return null;
}

export async function getCertificateByNumber(certNumber: string): Promise<Certificate | null> {
  if (isMongoConnected()) {
    try {
      const cert = await getCertificateByNumberMongo(certNumber);
      if (cert) return cert;
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Query failed, falling back to SQLite:', err);
    }
  }

  const db = await getDatabase();
  const stmt = db.prepare('SELECT * FROM certificates WHERE certificateNumber = :certNumber');
  stmt.bind({ ':certNumber': certNumber });
  if (stmt.step()) {
    const cert = rowToCertificate(stmt.getAsObject());
    stmt.free();
    return cert;
  }
  stmt.free();
  return null;
}

export const STARTING_CERTIFICATE_NUMBER = 26847;

export async function getNextCertificateNumber(): Promise<string> {
  const existingNumbers = new Set<string>();

  // 1. Gather existing numbers from MongoDB Atlas
  if (isMongoConnected()) {
    try {
      const mongoNumbers = await getAllCertificateNumbersMongo();
      for (const num of mongoNumbers) {
        const raw = String(num || '').trim();
        if (raw) {
          existingNumbers.add(raw);
          const clean = raw.replace(/[^0-9]/g, '');
          if (clean) {
            existingNumbers.add(clean);
            existingNumbers.add(`#${clean}`);
          }
        }
      }
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Query numbers failed, continuing with SQLite:', err);
    }
  }

  // 2. Gather existing numbers from local SQLite database
  try {
    const db = await getDatabase();
    const stmt = db.prepare('SELECT certificateNumber FROM certificates');
    while (stmt.step()) {
      const raw = String(stmt.getAsObject().certificateNumber || '').trim();
      if (raw) {
        existingNumbers.add(raw);
        const clean = raw.replace(/[^0-9]/g, '');
        if (clean) {
          existingNumbers.add(clean);
          existingNumbers.add(`#${clean}`);
        }
      }
    }
    stmt.free();
  } catch (err) {
    console.warn('[Cosmogeek SQLite] Query numbers failed:', err);
  }

  // Track pure numeric certificate numbers in the active series (>= STARTING_CERTIFICATE_NUMBER and < 31000)
  let maxInSeries = STARTING_CERTIFICATE_NUMBER - 1;
  for (const item of existingNumbers) {
    const match = item.match(/^#?(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= STARTING_CERTIFICATE_NUMBER && num < 31000) {
        if (num > maxInSeries) {
          maxInSeries = num;
        }
      }
    }
  }

  let candidate = Math.max(STARTING_CERTIFICATE_NUMBER, maxInSeries + 1);
  while (existingNumbers.has(`#${candidate}`) || existingNumbers.has(String(candidate))) {
    candidate++;
  }

  return `#${candidate}`;
}

export async function insertCertificate(cert: Certificate): Promise<Certificate> {
  const db = await getDatabase();

  // 1. Prevent duplicate IDs in SQLite first
  const stmtCheck = db.prepare('SELECT id FROM certificates WHERE certificateNumber = :num OR verificationId = :verId OR id = :id');
  stmtCheck.bind({ ':num': cert.certificateNumber, ':verId': cert.verificationId, ':id': cert.id });
  if (stmtCheck.step()) {
    stmtCheck.free();
    const err: any = new Error(`A certificate with number "${cert.certificateNumber}" or verification ID "${cert.verificationId}" already exists.`);
    err.code = 11000;
    err.statusCode = 409;
    throw err;
  }
  stmtCheck.free();

  // 2. Ensure MongoDB connection
  await ensureMongoConnected();

  let mongoSaved: Certificate | null = null;
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);

  if (isMongoConnected() && !isTest) {
    try {
      mongoSaved = await insertCertificateMongo(cert);
      console.log(`[Cosmogeek MongoDB] ✓ Student certificate ${cert.certificateNumber} (${cert.recipientName}) successfully saved to MongoDB Atlas collection "students".`);
    } catch (err: any) {
      console.error('[Cosmogeek MongoDB Error] Failed to insert student record into MongoDB Atlas:', err);
      throw err;
    }
  } else if (isTest && isMongoConnected()) {
    try {
      mongoSaved = await insertCertificateMongo(cert);
    } catch (err) {
      // Allow fallback during local unit testing
    }
  }

  // 3. Mirror/save to SQLite for local redundancy
  try {
    db.run(
      `INSERT INTO certificates (
        id, certificateNumber, verificationId, recipientName, recipientEmail,
        designation, department, certificateType, internshipDuration, startDate, endDate,
        issuingCompany, signatoryName, signatoryRole, initiatorName, approverName,
        approverDesignation, issueLocation, additionalNotes, contentBody, status, verificationUrl, verificationPath,
        pdfPath, issuedAt, revokedAt, revocationReason, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cert.id,
        cert.certificateNumber,
        cert.verificationId,
        cert.recipientName,
        cert.recipientEmail || null,
        cert.designation,
        cert.department || null,
        cert.certificateType,
        cert.internshipDuration,
        cert.startDate,
        cert.endDate,
        cert.issuingCompany,
        cert.signatoryName,
        cert.signatoryRole || null,
        cert.initiatorName || null,
        cert.approverName || null,
        cert.approverDesignation || null,
        cert.issueLocation || null,
        cert.additionalNotes || null,
        cert.contentBody || null,
        cert.status,
        cert.verificationUrl || null,
        cert.verificationPath,
        cert.pdfPath,
        cert.issuedAt,
        cert.revokedAt || null,
        cert.revocationReason || null,
        cert.createdAt,
        cert.updatedAt,
      ]
    );
    saveDatabaseToDisk();
  } catch (err: any) {
    console.error('[Cosmogeek] SQLite insert failed:', err);
    if (!mongoSaved) {
      throw err;
    }
  }

  return mongoSaved || cert;
}

export async function updateCertificate(
  id: string,
  updates: Partial<Certificate>
): Promise<Certificate | null> {
  // Update in SQLite
  const db = await getDatabase();
  const existing = await getCertificateById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  if (updates.status) {
    db.run('UPDATE certificates SET status = ?, updatedAt = ? WHERE id = ?', [updates.status, now, id]);
  }
  if (updates.recipientName) {
    db.run('UPDATE certificates SET recipientName = ?, updatedAt = ? WHERE id = ?', [updates.recipientName, now, id]);
  }
  if (updates.department !== undefined) {
    db.run('UPDATE certificates SET department = ?, updatedAt = ? WHERE id = ?', [updates.department, now, id]);
  }
  if (updates.contentBody !== undefined) {
    db.run('UPDATE certificates SET contentBody = ?, updatedAt = ? WHERE id = ?', [updates.contentBody, now, id]);
  }
  saveDatabaseToDisk();

  // Update in MongoDB
  if (isMongoConnected()) {
    try {
      const updatedMongo = await updateCertificateMongo(id, updates);
      if (updatedMongo) return updatedMongo;
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Update failed:', err);
    }
  }

  return getCertificateById(id);
}

export async function revokeCertificate(id: string, reason?: string): Promise<Certificate | null> {
  const cert = await getCertificateById(id);
  if (!cert) return null;

  const now = new Date().toISOString();
  const db = await getDatabase();

  db.run(
    `UPDATE certificates SET status = 'REVOKED', revokedAt = ?, revocationReason = ?, updatedAt = ? WHERE id = ?`,
    [now, reason || 'Revoked by administrator', now, id]
  );
  saveDatabaseToDisk();

  // Revoke in MongoDB
  if (isMongoConnected()) {
    try {
      await revokeCertificateMongo(id, reason);
      console.log(`[Cosmogeek MongoDB] ✓ Certificate ${cert.certificateNumber} revoked in MongoDB Atlas.`);
    } catch (err) {
      console.error('[Cosmogeek MongoDB Error] Failed to revoke certificate in MongoDB Atlas:', err);
    }
  }

  return getCertificateById(id);
}

export async function deleteCertificate(id: string): Promise<boolean> {
  const cert = await getCertificateById(id);
  if (!cert) return false;

  const db = await getDatabase();

  // 1. Delete from SQLite
  try {
    db.run(
      'DELETE FROM certificates WHERE id = ? OR certificateNumber = ? OR verificationId = ?',
      [cert.id, cert.certificateNumber, cert.verificationId]
    );
    saveDatabaseToDisk();
    console.log(`[Cosmogeek SQLite] ✓ Certificate ${cert.certificateNumber} (${cert.recipientName}) permanently deleted from SQLite.`);
  } catch (err) {
    console.warn('[Cosmogeek SQLite] Delete failed:', err);
  }

  // 2. Delete from MongoDB Atlas
  if (isMongoConnected()) {
    try {
      await deleteCertificateMongo(cert.id);
      console.log(`[Cosmogeek MongoDB] ✓ Certificate ${cert.certificateNumber} (${cert.recipientName}) permanently deleted from MongoDB Atlas collection "students".`);
    } catch (err) {
      console.error('[Cosmogeek MongoDB Error] Failed to delete certificate in MongoDB Atlas:', err);
      throw err;
    }
  }

  // 3. Delete associated exclusive PDF from storage
  try {
    const cleanNum = cert.certificateNumber.replace(/[^a-zA-Z0-9]/g, '');
    const STORAGE_DIR = path.resolve(process.cwd(), 'storage/certificates');
    const pdfPath = path.resolve(STORAGE_DIR, `${cleanNum}.pdf`);
    if (fs.existsSync(pdfPath) && pdfPath.startsWith(STORAGE_DIR)) {
      fs.unlinkSync(pdfPath);
      console.log(`[Cosmogeek Storage] ✓ Deleted certificate PDF: ${pdfPath}`);
    }
  } catch (fileErr) {
    console.warn('[Cosmogeek Storage] Notice: Could not remove certificate PDF file:', fileErr);
  }

  return true;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  if (isMongoConnected()) {
    try {
      return await getDashboardMetricsMongo();
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Query failed, falling back to SQLite:', err);
    }
  }

  const db = await getDatabase();
  const allRes = db.exec(`
    SELECT
      count(*) as total,
      sum(case when status = 'VALID' then 1 else 0 end) as validCount,
      sum(case when status = 'REVOKED' then 1 else 0 end) as revokedCount
    FROM certificates
  `);

  const row = allRes[0]?.values[0] || [0, 0, 0];
  const totalIssued = (row[0] as number) || 0;
  const validCertificates = (row[1] as number) || 0;
  const revokedCertificates = (row[2] as number) || 0;

  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const monthStmt = db.prepare('SELECT count(*) as count FROM certificates WHERE issuedAt LIKE :month');
  monthStmt.bind({ ':month': `${currentMonthPrefix}%` });
  let issuedThisMonth = 0;
  if (monthStmt.step()) {
    issuedThisMonth = (monthStmt.getAsObject().count as number) || 0;
  }
  monthStmt.free();

  return {
    totalIssued,
    validCertificates,
    revokedCertificates,
    issuedThisMonth,
  };
}

export async function getAdminByUsername(username: string): Promise<AdminUser & { passwordHash: string } | null> {
  const clean = username.trim();
  if (isMongoConnected()) {
    try {
      const admin = await getAdminByUsernameMongo(clean);
      if (admin) return admin;
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Admin query failed, falling back to SQLite:', err);
    }
  }

  const db = await getDatabase();
  const sqliteAdmin = await getAdminByUsernameSqlite(db, clean);
  if (sqliteAdmin) return sqliteAdmin;

  // Safe deterministic fallback for primary administrator
  if (clean.toLowerCase() === 'anirudh hatwar') {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || '@CosmoDGeek1911';
    return {
      id: 'admin_init_1',
      username: 'Anirudh Hatwar',
      passwordHash: bcrypt.hashSync(defaultPassword, 10),
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

export async function getAdminById(id: string): Promise<AdminUser | null> {
  if (isMongoConnected()) {
    try {
      const admin = await getAdminByIdMongo(id);
      if (admin) return admin;
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Admin query failed, falling back to SQLite:', err);
    }
  }

  const db = await getDatabase();
  const stmt = db.prepare('SELECT id, username, createdAt FROM admins WHERE id = :id');
  stmt.bind({ ':id': id });
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: String(row.id),
      username: String(row.username),
      createdAt: String(row.createdAt),
    };
  }
  stmt.free();

  if (id === 'admin_init_1') {
    return {
      id: 'admin_init_1',
      username: 'Anirudh Hatwar',
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

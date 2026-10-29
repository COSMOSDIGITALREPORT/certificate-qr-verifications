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
  insertCertificateMongo,
  updateCertificateMongo,
  revokeCertificateMongo,
  getDashboardMetricsMongo,
  getAdminByUsernameMongo,
  getAdminByIdMongo,
  saveAdminMongo,
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

  // Seed default admin if none exists
  const adminCheck = dbInstance.exec('SELECT count(*) as count FROM admins');
  const adminCount = (adminCheck[0]?.values[0]?.[0] as number) || 0;

  const defaultUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@Cosmogeek2026!';
  const now = new Date().toISOString();

  if (adminCount === 0) {
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);
    dbInstance.run(
      'INSERT INTO admins (id, username, passwordHash, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      ['admin_init_1', defaultUsername, passwordHash, now, now]
    );
  } else if (process.env.ADMIN_DEFAULT_PASSWORD) {
    const stmt = dbInstance.prepare('SELECT passwordHash FROM admins WHERE username = :username');
    stmt.bind({ ':username': defaultUsername });
    if (stmt.step()) {
      const currentHash = String(stmt.getAsObject().passwordHash);
      if (!bcrypt.compareSync(defaultPassword, currentHash)) {
        const newHash = bcrypt.hashSync(defaultPassword, 10);
        dbInstance.run('UPDATE admins SET passwordHash = ?, updatedAt = ? WHERE username = ?', [newHash, now, defaultUsername]);
      }
    }
    stmt.free();
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

      // Also sync default admin
      const admin = await getAdminByUsernameSqlite(dbInstance, defaultUsername);
      if (admin) {
        await saveAdminMongo(admin);
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

function getAllCertificatesSqliteSync(db: SqlJsDatabase): Certificate[] {
  const stmt = db.prepare('SELECT * FROM certificates ORDER BY createdAt DESC');
  const certificates: Certificate[] = [];
  while (stmt.step()) {
    certificates.push(rowToCertificate(stmt.getAsObject()));
  }
  stmt.free();
  return certificates;
}

async function getAdminByUsernameSqlite(db: SqlJsDatabase, username: string) {
  const stmt = db.prepare('SELECT * FROM admins WHERE username = :username');
  stmt.bind({ ':username': username });
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
  if (isMongoConnected()) {
    try {
      return await getNextCertificateNumberMongo();
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Query failed, falling back to SQLite:', err);
    }
  }

  const db = await getDatabase();
  const stmt = db.prepare('SELECT certificateNumber FROM certificates');
  const existingNumbers = new Set<string>();
  let maxInSeries = STARTING_CERTIFICATE_NUMBER - 1;

  while (stmt.step()) {
    const raw = String(stmt.getAsObject().certificateNumber || '').trim();
    if (raw) {
      existingNumbers.add(raw);
      const clean = raw.replace(/[^0-9]/g, '');
      if (clean) {
        existingNumbers.add(clean);
        existingNumbers.add(`#${clean}`);
      }

      // Track pure numeric certificate numbers in the continuous series (>= 26847 and < 31000)
      // ignoring legacy test anomalies (e.g. 31000s, 80000s, or prefixed codes)
      const match = raw.match(/^#?(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num >= STARTING_CERTIFICATE_NUMBER && num < 31000) {
          if (num > maxInSeries) {
            maxInSeries = num;
          }
        }
      }
    }
  }
  stmt.free();

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

  // 2. Ensure MongoDB connection if MONGODB_URI is configured
  await ensureMongoConnected();

  let mongoSaved: Certificate | null = null;
  const uri = process.env.MONGODB_URI?.trim();
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);

  if (uri && !isTest) {
    if (!isMongoConnected()) {
      const health = getMongoHealth();
      const reason = health.error || 'Connection could not be established';
      throw new Error(`Failed to connect to MongoDB Atlas (DB: certificateDB, Collection: students): ${reason}. Please verify MONGODB_URI and IP access in MongoDB Atlas.`);
    }

    try {
      mongoSaved = await insertCertificateMongo(cert);
      console.log(`[Cosmogeek MongoDB] ✓ Student certificate ${cert.certificateNumber} (${cert.recipientName}) successfully saved to MongoDB Atlas collection "students".`);
    } catch (err: any) {
      console.error('[Cosmogeek MongoDB Error] Failed to insert student record into MongoDB Atlas:', err);
      throw err;
    }
  } else if (uri && isTest && isMongoConnected()) {
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
        approverDesignation, issueLocation, additionalNotes, status, verificationUrl, verificationPath,
        pdfPath, issuedAt, revokedAt, revocationReason, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  if (isMongoConnected()) {
    try {
      const admin = await getAdminByUsernameMongo(username);
      if (admin) return admin;
    } catch (err) {
      console.warn('[Cosmogeek MongoDB] Admin query failed, falling back to SQLite:', err);
    }
  }

  const db = await getDatabase();
  return getAdminByUsernameSqlite(db, username);
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
  return null;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from 'dotenv';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { Certificate, CertificateStatus, DashboardMetrics, AdminUser } from '../src/types/index.js';

const DATABASE_NAME = 'certificateDB';
const STUDENTS_COLLECTION = 'students';
const ADMINS_COLLECTION = 'admins';

export interface IStudentCertificateDoc extends Document {
  id: string;
  certificateNumber: string;
  verificationId: string;
  studentName?: string;
  recipientName: string;
  recipientEmail?: string | null;
  designation: string;
  department?: string | null;
  certificateType: string;
  internshipDuration: string;
  startDate: string;
  endDate: string;
  issuingCompany: string;
  signatoryName: string;
  signatoryRole?: string | null;
  initiatorName?: string | null;
  approverName?: string | null;
  approverDesignation?: string | null;
  issueLocation?: string | null;
  additionalNotes?: string | null;
  status: CertificateStatus;
  verificationUrl: string;
  verificationPath: string;
  pdfPath: string;
  issuedAt: string;
  revokedAt?: string | null;
  revocationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const StudentCertificateSchema = new Schema<IStudentCertificateDoc>(
  {
    id: { type: String, required: true, unique: true },
    certificateNumber: { type: String, required: true, unique: true, index: true, trim: true },
    verificationId: { type: String, required: true, unique: true, index: true, trim: true },
    studentName: { type: String, trim: true },
    recipientName: { type: String, required: true, trim: true },
    recipientEmail: { type: String, trim: true, default: null },
    designation: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: null },
    certificateType: { type: String, default: 'Certificate of Completion', trim: true },
    internshipDuration: { type: String, required: true, trim: true },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, required: true, trim: true },
    issuingCompany: { type: String, default: 'Cosmogeek Software Solutions Pvt. Ltd.', trim: true },
    signatoryName: { type: String, default: 'Anirudh Hatwar', trim: true },
    signatoryRole: { type: String, default: 'Director / Authorized Signatory', trim: true },
    initiatorName: { type: String, default: null, trim: true },
    approverName: { type: String, default: null, trim: true },
    approverDesignation: { type: String, default: null, trim: true },
    issueLocation: { type: String, default: 'Nagpur, Maharashtra, India', trim: true },
    additionalNotes: { type: String, default: null, trim: true },
    status: { type: String, enum: ['VALID', 'REVOKED'], default: 'VALID', index: true },
    verificationUrl: { type: String, required: true, trim: true },
    verificationPath: { type: String, required: true, trim: true },
    pdfPath: { type: String, required: true, trim: true },
    issuedAt: { type: String, required: true },
    revokedAt: { type: String, default: null },
    revocationReason: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: STUDENTS_COLLECTION,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);


export interface IAdminDoc extends Document {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

const AdminSchema = new Schema<IAdminDoc>(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, index: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: ADMINS_COLLECTION,
  }
);

export const StudentCertificateModel: Model<IStudentCertificateDoc> =
  mongoose.models.StudentCertificate ||
  mongoose.model<IStudentCertificateDoc>('StudentCertificate', StudentCertificateSchema, STUDENTS_COLLECTION);

export const AdminModel: Model<IAdminDoc> =
  mongoose.models.AdminUser ||
  mongoose.model<IAdminDoc>('AdminUser', AdminSchema, ADMINS_COLLECTION);

let isConnecting = false;
let lastConnectionError: string | null = null;

/**
 * Resolves the MongoDB connection string, supporting MONGODB_URI directly or
 * interpolating MONGODB_USERNAME and MONGODB_PASSWORD if placeholders exist,
 * and ensuring database name 'certificateDB' is present.
 */
export function getResolvedMongoUri(): string | null {
  try {
    dotenv.config({ override: true });
  } catch {}

  let uri = process.env.MONGODB_URI?.trim();
  const username = process.env.MONGODB_USERNAME?.trim();
  const password = process.env.MONGODB_PASSWORD?.trim();

  // If URI contains <username> or <password> placeholders, replace them with actual values
  if (uri && (uri.includes('<username>') || uri.includes('<password>'))) {
    if (username && password) {
      uri = uri
        .replace('<username>', encodeURIComponent(username))
        .replace('<password>', encodeURIComponent(password));
    }
  }

  // If URI is missing but username, password, and cluster are provided
  if (!uri && username && password && process.env.MONGODB_CLUSTER) {
    const cluster = process.env.MONGODB_CLUSTER.replace(/^mongodb\+srv:\/\//, '').replace(/\/$/, '');
    uri = `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cluster}/certificateDB?retryWrites=true&w=majority`;
  }

  // Built-in cluster fallback to ensure Render connects seamlessly even if env var was not pasted into Render dashboard
  if (!uri) {
    uri = 'mongodb+srv://cosmosdigital44_db_user:AIobXTgkO3UkakXJ@cluster0.pnojrrc.mongodb.net/certificateDB?retryWrites=true&w=majority';
  }

  // Ensure certificateDB is in the URI if not present
  if (uri.startsWith('mongodb+srv://') || uri.startsWith('mongodb://')) {
    const parts = uri.split('?');
    let base = parts[0];
    const query = parts[1] ? `?${parts[1]}` : '?retryWrites=true&w=majority';

    const schemeEnd = uri.indexOf('://') + 3;
    const slashIndex = base.indexOf('/', schemeEnd);
    if (slashIndex === -1 || slashIndex === base.length - 1) {
      base = base.replace(/\/$/, '') + `/${DATABASE_NAME}`;
      uri = `${base}${query}`;
    }
  }

  return uri;
}

/**
 * Connects to MongoDB Atlas using the configured MONGODB_URI.
 * Connects to database: certificateDB
 */
export async function connectMongoDB(forceReloadEnv = true): Promise<boolean> {
  if (forceReloadEnv) {
    try {
      dotenv.config({ override: true });
    } catch {}
  }

  const uri = getResolvedMongoUri();

  if (!uri) {
    lastConnectionError = 'MONGODB_URI is not set in environment or .env file';
    return false;
  }

  // If already connected
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (isConnecting) {
    // Wait for ongoing connection
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return mongoose.connection.readyState === 1;
    } catch {
      return false;
    }
  }

  isConnecting = true;
  lastConnectionError = null;

  try {
    console.log(`[Cosmogeek MongoDB] Connecting to MongoDB Atlas database "${DATABASE_NAME}"...`);
    await mongoose.connect(uri, {
      dbName: DATABASE_NAME,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 15000,
    });

    console.log(`[Cosmogeek MongoDB] ✓ Successfully connected to MongoDB Atlas (DB: ${DATABASE_NAME}, Collection: ${STUDENTS_COLLECTION})`);
    isConnecting = false;
    return true;
  } catch (err: any) {
    isConnecting = false;
    lastConnectionError = err?.message || 'Failed to connect to MongoDB';
    console.warn(`[Cosmogeek MongoDB Warning] MongoDB connection failed: ${lastConnectionError}. Continuing with local SQLite fallback.`);
    return false;
  }
}

/**
 * Ensures MongoDB is connected, re-attempting if necessary.
 */
export async function ensureMongoConnected(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  return await connectMongoDB(true);
}

/**
 * Checks if MongoDB is currently connected
 */
export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Returns health status of MongoDB connection
 */
export function getMongoHealth(): {
  connected: boolean;
  readyState: number;
  database: string;
  collection: string;
  error?: string | null;
} {
  return {
    connected: isMongoConnected(),
    readyState: mongoose.connection.readyState,
    database: DATABASE_NAME,
    collection: STUDENTS_COLLECTION,
    error: isMongoConnected() ? null : lastConnectionError,
  };
}

/**
 * Converts a Mongoose document or plain object to Certificate
 */
function docToCertificate(doc: any): Certificate {
  return {
    id: doc.id || String(doc._id),
    certificateNumber: doc.certificateNumber,
    verificationId: doc.verificationId,
    recipientName: doc.recipientName,
    recipientEmail: doc.recipientEmail || null,
    designation: doc.designation,
    department: doc.department || null,
    certificateType: doc.certificateType || 'Certificate of Completion',
    internshipDuration: doc.internshipDuration,
    startDate: doc.startDate,
    endDate: doc.endDate,
    issuingCompany: doc.issuingCompany,
    signatoryName: doc.signatoryName,
    signatoryRole: doc.signatoryRole || null,
    initiatorName: doc.initiatorName || null,
    approverName: doc.approverName || null,
    approverDesignation: doc.approverDesignation || null,
    issueLocation: doc.issueLocation || null,
    additionalNotes: doc.additionalNotes || null,
    status: (doc.status as CertificateStatus) || 'VALID',
    verificationUrl: doc.verificationUrl,
    verificationPath: doc.verificationPath,
    pdfPath: doc.pdfPath,
    issuedAt: doc.issuedAt,
    revokedAt: doc.revokedAt || null,
    revocationReason: doc.revocationReason || null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

/**
 * MongoDB Certificate Operations
 */

export async function getAllCertificatesMongo(options: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ certificates: Certificate[]; total: number }> {
  const { search, status, limit = 50, offset = 0 } = options;
  const filter: any = {};

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { recipientName: regex },
      { certificateNumber: regex },
      { designation: regex },
      { department: regex },
    ];
  }

  if (status && (status === 'VALID' || status === 'REVOKED')) {
    filter.status = status;
  }

  const [total, docs] = await Promise.all([
    StudentCertificateModel.countDocuments(filter),
    StudentCertificateModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
  ]);

  return {
    certificates: docs.map(docToCertificate),
    total,
  };
}

export async function getCertificateByIdMongo(id: string): Promise<Certificate | null> {
  const doc = await StudentCertificateModel.findOne({ id }).lean();
  return doc ? docToCertificate(doc) : null;
}

export async function getCertificateByVerificationIdMongo(verificationId: string): Promise<Certificate | null> {
  const doc = await StudentCertificateModel.findOne({ verificationId }).lean();
  return doc ? docToCertificate(doc) : null;
}

export async function getCertificateByNumberMongo(certificateNumber: string): Promise<Certificate | null> {
  const doc = await StudentCertificateModel.findOne({ certificateNumber }).lean();
  return doc ? docToCertificate(doc) : null;
}

export const STARTING_CERTIFICATE_NUMBER = 26847;

export async function getNextCertificateNumberMongo(): Promise<string> {
  const docs = await StudentCertificateModel.find({}, { certificateNumber: 1 }).lean();
  const existingNumbers = new Set<string>();
  let maxInSeries = STARTING_CERTIFICATE_NUMBER - 1;

  for (const doc of docs) {
    const raw = String(doc.certificateNumber || '').trim();
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

  let candidate = Math.max(STARTING_CERTIFICATE_NUMBER, maxInSeries + 1);
  while (existingNumbers.has(`#${candidate}`) || existingNumbers.has(String(candidate))) {
    candidate++;
  }

  return `#${candidate}`;
}

export async function insertCertificateMongo(cert: Certificate): Promise<Certificate> {
  // Prevent duplicate certificate IDs (certificateNumber, verificationId, or record id)
  const existing = await StudentCertificateModel.findOne({
    $or: [
      { certificateNumber: cert.certificateNumber },
      { verificationId: cert.verificationId },
      { id: cert.id },
    ],
  }).lean();

  if (existing) {
    const dupField =
      existing.certificateNumber === cert.certificateNumber
        ? `Certificate number "${cert.certificateNumber}"`
        : existing.verificationId === cert.verificationId
        ? `Verification ID "${cert.verificationId}"`
        : `Record ID "${cert.id}"`;
    const err: any = new Error(`${dupField} already exists in MongoDB database certificateDB.students.`);
    err.code = 11000;
    err.statusCode = 409;
    throw err;
  }

  const now = new Date().toISOString();
  const studentDoc = new StudentCertificateModel({
    id: cert.id,
    certificateNumber: cert.certificateNumber,
    verificationId: cert.verificationId,
    studentName: cert.recipientName,
    recipientName: cert.recipientName,
    recipientEmail: cert.recipientEmail || null,
    designation: cert.designation,
    department: cert.department || null,
    certificateType: cert.certificateType,
    internshipDuration: cert.internshipDuration,
    startDate: cert.startDate,
    endDate: cert.endDate,
    issuingCompany: cert.issuingCompany,
    signatoryName: cert.signatoryName,
    signatoryRole: cert.signatoryRole || null,
    initiatorName: cert.initiatorName || null,
    approverName: cert.approverName || null,
    approverDesignation: cert.approverDesignation || null,
    issueLocation: cert.issueLocation || null,
    additionalNotes: cert.additionalNotes || null,
    status: cert.status,
    verificationUrl: cert.verificationUrl,
    verificationPath: cert.verificationPath,
    pdfPath: cert.pdfPath,
    issuedAt: cert.issuedAt,
    revokedAt: cert.revokedAt || null,
    revocationReason: cert.revocationReason || null,
    createdAt: cert.createdAt || now,
    updatedAt: cert.updatedAt || now,
  });

  const saved = await studentDoc.save();
  return docToCertificate(saved);
}

export async function updateCertificateMongo(
  id: string,
  updates: Partial<Certificate>
): Promise<Certificate | null> {
  const now = new Date().toISOString();
  const doc = await StudentCertificateModel.findOneAndUpdate(
    { id },
    {
      $set: {
        ...updates,
        updatedAt: now,
      },
    },
    { new: true }
  ).lean();

  return doc ? docToCertificate(doc) : null;
}

export async function revokeCertificateMongo(id: string, reason?: string): Promise<Certificate | null> {
  const now = new Date().toISOString();
  const doc = await StudentCertificateModel.findOneAndUpdate(
    { id },
    {
      $set: {
        status: 'REVOKED',
        revokedAt: now,
        revocationReason: reason || 'Revoked by administrator',
        updatedAt: now,
      },
    },
    { new: true }
  ).lean();

  return doc ? docToCertificate(doc) : null;
}

export async function getDashboardMetricsMongo(): Promise<DashboardMetrics> {
  const [totalIssued, validCertificates, revokedCertificates] = await Promise.all([
    StudentCertificateModel.countDocuments({}),
    StudentCertificateModel.countDocuments({ status: 'VALID' }),
    StudentCertificateModel.countDocuments({ status: 'REVOKED' }),
  ]);

  const currentMonthPrefix = new Date().toISOString().substring(0, 7); // e.g. "2026-10"
  const issuedThisMonth = await StudentCertificateModel.countDocuments({
    issuedAt: { $regex: `^${currentMonthPrefix}` },
  });

  return {
    totalIssued,
    validCertificates,
    revokedCertificates,
    issuedThisMonth,
  };
}

export async function getAdminByUsernameMongo(username: string): Promise<AdminUser & { passwordHash: string } | null> {
  const clean = username.trim();
  const escaped = clean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const doc = await AdminModel.findOne({
    username: { $regex: new RegExp(`^${escaped}$`, 'i') },
  }).lean();
  if (!doc) return null;
  return {
    id: doc.id,
    username: doc.username,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

export async function getAdminByIdMongo(id: string): Promise<AdminUser | null> {
  const doc = await AdminModel.findOne({ id }).lean();
  if (!doc) return null;
  return {
    id: doc.id,
    username: doc.username,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
  };
}

export async function saveAdminMongo(admin: { id: string; username: string; passwordHash: string; createdAt: string; updatedAt: string }): Promise<void> {
  await AdminModel.findOneAndUpdate(
    { username: admin.username },
    {
      $set: {
        id: admin.id,
        username: admin.username,
        passwordHash: admin.passwordHash,
        updatedAt: admin.updatedAt,
      },
      $setOnInsert: {
        createdAt: admin.createdAt,
      },
    },
    { upsert: true }
  );
}

/**
 * Synchronizes or updates the primary admin credentials in MongoDB Atlas
 * Preserves the primary admin id ('admin_init_1') so active sessions remain valid.
 */
export async function syncDefaultAdminMongo(targetUsername: string, targetPasswordHash: string): Promise<void> {
  if (!isMongoConnected()) return;

  const cleanUser = targetUsername.trim();
  const now = new Date();

  // Find primary admin or any existing admin record
  const escaped = cleanUser.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const existing = await AdminModel.findOne({
    $or: [
      { id: 'admin_init_1' },
      { username: 'admin' },
      { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
    ],
  });

  if (existing) {
    existing.id = 'admin_init_1';
    existing.username = cleanUser;
    existing.passwordHash = targetPasswordHash;
    existing.updatedAt = now;
    await existing.save();
    console.log(`[Cosmogeek MongoDB] ✓ Synchronized admin account "${cleanUser}" in MongoDB Atlas.`);
  } else {
    await AdminModel.create({
      id: 'admin_init_1',
      username: cleanUser,
      passwordHash: targetPasswordHash,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`[Cosmogeek MongoDB] ✓ Created default admin "${cleanUser}" in MongoDB Atlas.`);
  }

  // Safely clean up any leftover orphan document with username 'admin' that isn't 'admin_init_1'
  if (cleanUser.toLowerCase() !== 'admin') {
    await AdminModel.deleteMany({
      username: 'admin',
      id: { $ne: 'admin_init_1' },
    });
  }
}

/**
 * Migration helper: Safely migrates existing records from SQLite into MongoDB collection "students".
 * Avoids any duplicate insertions.
 */
export async function migrateSqliteToMongo(sqliteCertificates: Certificate[]): Promise<number> {
  if (!isMongoConnected() || !sqliteCertificates.length) return 0;

  let migratedCount = 0;
  for (const cert of sqliteCertificates) {
    const existing = await StudentCertificateModel.findOne({
      $or: [{ certificateNumber: cert.certificateNumber }, { verificationId: cert.verificationId }],
    });

    if (!existing) {
      await StudentCertificateModel.create({
        ...cert,
        department: cert.department || null,
        verificationUrl: cert.verificationUrl || `http://192.168.101.73:3000${cert.verificationPath}`,
      });
      migratedCount++;
    }
  }

  if (migratedCount > 0) {
    console.log(`[Cosmogeek MongoDB] ✓ Successfully migrated ${migratedCount} existing certificates into MongoDB Atlas "students" collection.`);
  }

  return migratedCount;
}

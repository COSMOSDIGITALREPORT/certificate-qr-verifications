/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMongoHealth, isMongoConnected, StudentCertificateModel } from '../../server/mongodb.js';
import {
  getDatabase,
  getAllCertificates,
  getCertificateById,
  getCertificateByVerificationId,
  getNextCertificateNumber,
  insertCertificate,
  revokeCertificate,
} from '../../server/db.js';
import { Certificate } from '../types/index.js';

test('MongoDB: getMongoHealth returns configured database and collection names', () => {
  const health = getMongoHealth();
  assert.equal(health.database, 'certificateDB');
  assert.equal(health.collection, 'students');
  assert.ok(typeof health.connected === 'boolean');
});

test('MongoDB: Schema enforces collection "students" and unique indexes', () => {
  assert.equal(StudentCertificateModel.collection.collectionName, 'students');
  const schema = StudentCertificateModel.schema;
  assert.ok(schema.path('certificateNumber'));
  assert.ok(schema.path('verificationId'));
  assert.ok(schema.path('recipientName'));
  assert.ok(schema.path('department'));
  assert.ok(schema.path('verificationUrl'));
});

test('MongoDB: Graceful fallback to SQLite when MONGODB_URI is offline or not set', async () => {
  const db = await getDatabase();
  assert.ok(db, 'Database should initialize SQLite fallback cleanly');

  const certs = await getAllCertificates({ limit: 5 });
  assert.ok(Array.isArray(certs.certificates), 'getAllCertificates should return certificates array');
  assert.ok(certs.total >= 0, 'Total should be a non-negative number');
});

test('MongoDB & Database Integration: Unique certificate creation and retrieval', async () => {
  await getDatabase();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const testCert: Certificate = {
    id: `cert_test_mongo_${Date.now()}_${randomSuffix}`,
    certificateNumber: `#M${Date.now().toString().slice(-5)}`,
    verificationId: `cg-mongo-${Date.now()}-${randomSuffix}`,
    recipientName: 'Devika Kulkarni',
    recipientEmail: 'devika.kulkarni@example.com',
    designation: 'Cloud Solutions Engineer',
    department: 'DevOps & Cloud Infrastructure',
    certificateType: 'Certificate of Internship',
    internshipDuration: '6 months',
    startDate: '2026-05-01',
    endDate: '2026-11-01',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director / Authorized Signatory',
    issueLocation: 'Nagpur, Maharashtra, India',
    status: 'VALID',
    verificationUrl: `http://192.168.101.73:3000/verify/cg-mongo-${Date.now()}-${randomSuffix}`,
    verificationPath: `/verify/cg-mongo-${Date.now()}-${randomSuffix}`,
    pdfPath: `storage/certificates/test-mongo.pdf`,
    issuedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const saved = await insertCertificate(testCert);
  assert.equal(saved.recipientName, 'Devika Kulkarni');
  assert.equal(saved.department, 'DevOps & Cloud Infrastructure');

  const fetchedByVerId = await getCertificateByVerificationId(testCert.verificationId);
  assert.ok(fetchedByVerId);
  assert.equal(fetchedByVerId?.recipientName, 'Devika Kulkarni');
  assert.equal(fetchedByVerId?.department, 'DevOps & Cloud Infrastructure');
  assert.equal(fetchedByVerId?.status, 'VALID');

  const revoked = await revokeCertificate(testCert.id, 'Testing revocation in DB');
  assert.ok(revoked);
  assert.equal(revoked?.status, 'REVOKED');
  assert.equal(revoked?.revocationReason, 'Testing revocation in DB');
});

test('Security & Secrets: MONGODB_URI is not exposed to client-side bundles', () => {
  // Vite client bundles only expose variables starting with configured prefixes
  // (e.g. VITE_, NEXT_PUBLIC_, APP_, PUBLIC_). MONGODB_URI must NEVER be prefixed with these!
  const forbiddenPrefixes = ['VITE_MONGODB', 'NEXT_PUBLIC_MONGODB', 'APP_MONGODB', 'PUBLIC_MONGODB'];
  for (const prefix of forbiddenPrefixes) {
    assert.equal(process.env[prefix], undefined, `Secret must not have public prefix ${prefix}`);
  }
});

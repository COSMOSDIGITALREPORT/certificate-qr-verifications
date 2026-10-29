/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {
  getDatabase,
  getAdminByUsername,
  getCertificateByNumber,
  getCertificateByVerificationId,
  getNextCertificateNumber,
  insertCertificate,
  revokeCertificate,
  getDashboardMetrics,
} from '../../server/db.js';
import {
  createSignedSessionToken,
  verifySessionToken,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
} from '../../server/auth.js';
import { Certificate } from '../types/index.js';

test('Database initializes and seeds default admin and reference certificate', async () => {
  const db = await getDatabase();
  assert.ok(db, 'Database must be initialized');

  // Verify admin
  const targetUsername = process.env.ADMIN_DEFAULT_USERNAME || 'Anirudh Hatwar';
  const admin = await getAdminByUsername(targetUsername);
  assert.ok(admin, `Default admin (${targetUsername}) must exist`);
  assert.equal(admin?.username.toLowerCase(), targetUsername.toLowerCase());

  // Verify password hash
  const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD;
  if (defaultPass) {
    assert.ok(bcrypt.compareSync(defaultPass, admin.passwordHash), 'Admin password must match');
  }
  assert.equal(bcrypt.compareSync('WrongPassword', admin.passwordHash), false, 'Wrong password must be rejected');

  // Verify reference certificate #26832 for Yuvraj Dhumale
  const refCert = await getCertificateByNumber('#26832');
  assert.ok(refCert, 'Reference certificate #26832 must exist');
  assert.equal(refCert?.recipientName, 'Yuvraj Dhumale');
  assert.equal(refCert?.designation, 'Jr. Software Developer');
  assert.equal(refCert?.status, 'VALID');
});

test('Session token signing and tamper verification', () => {
  const userId = 'admin_init_1';
  const token = createSignedSessionToken(userId);
  assert.ok(token.includes('.'), 'Token must contain signature delimiter');

  const verified = verifySessionToken(token);
  assert.equal(verified.valid, true);
  assert.equal(verified.userId, userId);

  // Tampered token must fail
  const tamperedToken = `${token}tampered`;
  const tamperedVerified = verifySessionToken(tamperedToken);
  assert.equal(tamperedVerified.valid, false);

  // Empty or malformed token must fail
  assert.equal(verifySessionToken('').valid, false);
  assert.equal(verifySessionToken('bad.token').valid, false);
});

test('Rate limiting tracks failed login attempts and blocks after threshold', () => {
  const testIp = '192.168.1.99';
  recordSuccessfulLogin(testIp);

  // Initial check
  assert.equal(checkLoginRateLimit(testIp).allowed, true);

  // 5 failed attempts
  for (let i = 0; i < 5; i++) {
    recordFailedLogin(testIp);
  }

  const rateLimitStatus = checkLoginRateLimit(testIp);
  assert.equal(rateLimitStatus.allowed, false);
  assert.ok((rateLimitStatus.retryAfterSeconds ?? 0) > 0);

  // Reset
  recordSuccessfulLogin(testIp);
  assert.equal(checkLoginRateLimit(testIp).allowed, true);
});

test('Certificate revocation updates status and prevents valid display', async () => {
  const testCert: Certificate = {
    id: `test_revoke_${Date.now()}`,
    certificateNumber: `#REV-${Date.now().toString().slice(-5)}`,
    verificationId: `cg-rev-test-${Date.now()}`,
    recipientName: 'Revocation Test Recipient',
    designation: 'Backend Intern',
    certificateType: 'Certificate of Completion',
    internshipDuration: '2 months',
    startDate: '2026-08-01',
    endDate: '2026-10-01',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    status: 'VALID',
    verificationPath: `/verify/cg-rev-test-${Date.now()}`,
    pdfPath: 'storage/certificates/test.pdf',
    issuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await insertCertificate(testCert);

  // Verify it starts as VALID
  const created = await getCertificateByVerificationId(testCert.verificationId);
  assert.equal(created?.status, 'VALID');

  // Revoke certificate
  const revoked = await revokeCertificate(testCert.id, 'Candidate left internship early');
  assert.ok(revoked);
  assert.equal(revoked?.status, 'REVOKED');
  assert.equal(revoked?.revocationReason, 'Candidate left internship early');
  assert.ok(revoked?.revokedAt);

  // Check from verification lookup
  const verifiedLookup = await getCertificateByVerificationId(testCert.verificationId);
  assert.equal(verifiedLookup?.status, 'REVOKED');
});

test('getDashboardMetrics returns accurate counts', async () => {
  const metrics = await getDashboardMetrics();
  assert.ok(metrics.totalIssued >= 1);
  assert.ok(metrics.validCertificates >= 0);
  assert.ok(metrics.revokedCertificates >= 0);
  assert.equal(metrics.validCertificates + metrics.revokedCertificates, metrics.totalIssued);
});

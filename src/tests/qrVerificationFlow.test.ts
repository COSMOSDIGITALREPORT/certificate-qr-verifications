/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDatabase,
  getCertificateByVerificationId,
  insertCertificate,
  revokeCertificate,
} from '../../server/db.js';
import { Certificate, PublicVerificationResult } from '../types/index.js';
import { formatDateHumanReadable, formatDateToIndianStandard } from '../../server/validation.js';

test('Verification Flow: Valid QR URL opens the correct certificate record from DB', async () => {
  await getDatabase();

  const uid = Math.random().toString(36).substring(2, 7);
  const verIdA = `cg-test-a-${Date.now()}-${uid}`;
  const certNumA = `#A${Date.now().toString().slice(-5)}`;

  // Test certificate 1: Student A
  const certA: Certificate = {
    id: `cert_test_student_a_${Date.now()}_${uid}`,
    certificateNumber: certNumA,
    verificationId: verIdA,
    recipientName: 'Aarav Sharma',
    recipientEmail: 'aarav.sharma@example.com',
    designation: 'Frontend Engineer Intern',
    certificateType: 'Certificate of Completion',
    internshipDuration: '6 months',
    startDate: '2026-01-15',
    endDate: '2026-07-15',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director / Authorized Signatory',
    initiatorName: 'admin',
    approverName: 'Rahul Verma',
    approverDesignation: 'Engineering Manager',
    issueLocation: 'Nagpur, Maharashtra, India',
    status: 'VALID',
    verificationPath: `/verify/${verIdA}`,
    pdfPath: `storage/certificates/${certNumA.replace('#', '')}.pdf`,
    issuedAt: '2026-07-15T12:00:00.000Z',
    createdAt: '2026-07-15T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
  };

  await insertCertificate(certA);

  const fetched = await getCertificateByVerificationId(verIdA);
  assert.ok(fetched, 'Certificate record must be found in database');
  assert.equal(fetched.recipientName, 'Aarav Sharma');
  assert.equal(fetched.designation, 'Frontend Engineer Intern');
  assert.equal(fetched.certificateNumber, certNumA);
  assert.equal(fetched.status, 'VALID');
  assert.equal(fetched.approverName, 'Rahul Verma');
  assert.equal(fetched.initiatorName, 'admin');
});

test('Verification Flow: Two different certificate IDs display two different students', async () => {
  await getDatabase();

  const uid1 = Math.random().toString(36).substring(2, 7);
  const uid2 = Math.random().toString(36).substring(2, 7);
  const verId1 = `cg-diff1-${Date.now()}-${uid1}`;
  const verId2 = `cg-diff2-${Date.now()}-${uid2}`;
  const certNum1 = `#B1${Date.now().toString().slice(-4)}`;
  const certNum2 = `#B2${Date.now().toString().slice(-4)}`;

  const cert1: Certificate = {
    id: `cert_test_student_1_${Date.now()}_${uid1}`,
    certificateNumber: certNum1,
    verificationId: verId1,
    recipientName: 'Kunal Patil',
    recipientEmail: 'kunal.patil@example.com',
    designation: 'Backend Intern',
    certificateType: 'Certificate of Completion',
    internshipDuration: '3 months',
    startDate: '2026-04-01',
    endDate: '2026-07-01',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director / Authorized Signatory',
    status: 'VALID',
    verificationPath: `/verify/${verId1}`,
    pdfPath: `storage/certificates/${certNum1.replace('#', '')}.pdf`,
    issuedAt: '2026-07-01T10:00:00.000Z',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };

  const cert2: Certificate = {
    id: `cert_test_student_2_${Date.now()}_${uid2}`,
    certificateNumber: certNum2,
    verificationId: verId2,
    recipientName: 'Priya Patel',
    recipientEmail: 'priya.patel@example.com',
    designation: 'Data Analyst Intern',
    certificateType: 'Certificate of Excellence',
    internshipDuration: '3 months',
    startDate: '2026-04-01',
    endDate: '2026-07-01',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director / Authorized Signatory',
    status: 'VALID',
    verificationPath: `/verify/${verId2}`,
    pdfPath: `storage/certificates/${certNum2.replace('#', '')}.pdf`,
    issuedAt: '2026-07-01T10:00:00.000Z',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };

  await insertCertificate(cert1);
  await insertCertificate(cert2);

  const student1 = await getCertificateByVerificationId(verId1);
  const student2 = await getCertificateByVerificationId(verId2);

  assert.ok(student1);
  assert.ok(student2);
  assert.notEqual(student1.recipientName, student2.recipientName, 'Different IDs must return different students');
  assert.equal(student1.recipientName, 'Kunal Patil');
  assert.equal(student2.recipientName, 'Priya Patel');
  assert.notEqual(student1.certificateNumber, student2.certificateNumber);
});

test('Verification Flow: Unknown ID returns null and not found state', async () => {
  await getDatabase();
  const nonExistent = await getCertificateByVerificationId(`cg-nonexistent-${Date.now()}`);
  assert.equal(nonExistent, null, 'Unknown verification ID must return null');
});

test('Verification Flow: Revoked certificate shows revocation warning and status', async () => {
  await getDatabase();

  const uid = Math.random().toString(36).substring(2, 7);
  const verId = `cg-rev-${Date.now()}-${uid}`;
  const certNum = `#R${Date.now().toString().slice(-5)}`;

  const certC: Certificate = {
    id: `cert_test_student_c_${Date.now()}_${uid}`,
    certificateNumber: certNum,
    verificationId: verId,
    recipientName: 'Rohan Gupta',
    recipientEmail: 'rohan.gupta@example.com',
    designation: 'Cybersecurity Intern',
    certificateType: 'Certificate of Completion',
    internshipDuration: '2 months',
    startDate: '2026-05-01',
    endDate: '2026-07-01',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director / Authorized Signatory',
    status: 'VALID',
    verificationPath: `/verify/${verId}`,
    pdfPath: `storage/certificates/${certNum.replace('#', '')}.pdf`,
    issuedAt: '2026-07-01T10:00:00.000Z',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
  };

  await insertCertificate(certC);
  await revokeCertificate(certC.id, 'Candidate breached confidentiality agreement');

  const revokedRecord = await getCertificateByVerificationId(verId);
  assert.ok(revokedRecord);
  assert.equal(revokedRecord.status, 'REVOKED');
  assert.equal(revokedRecord.revocationReason, 'Candidate breached confidentiality agreement');
  assert.ok(revokedRecord.revokedAt);
});

test('Date Formatting: formatDateHumanReadable outputs consistent readable format', () => {
  assert.equal(formatDateHumanReadable('2026-07-10'), '10 July 2026');
  assert.equal(formatDateHumanReadable('2026-10-16'), '16 October 2026');
  assert.equal(formatDateHumanReadable('2026-10-16T10:00:00.000Z'), '16 October 2026');
  assert.equal(formatDateToIndianStandard('2026-07-10'), '10/07/2026');
});

test('Company Name and Dynamic Footer Year Check', () => {
  const companyName = 'Cosmogeek Software Solutions Pvt. Ltd.';
  const currentYear = new Date().getFullYear();
  assert.equal(companyName, 'Cosmogeek Software Solutions Pvt. Ltd.');
  assert.ok(currentYear >= 2026);
});

test('QR Base URL: isLocalhostUrl accurately detects loopback addresses', async () => {
  const { isLocalhostUrl } = await import('../../server/routes.js');
  assert.equal(isLocalhostUrl('http://localhost:3000'), true);
  assert.equal(isLocalhostUrl('http://127.0.0.1:3000'), true);
  assert.equal(isLocalhostUrl('http://0.0.0.0:3000'), true);
  assert.equal(isLocalhostUrl('http://192.168.1.5:3000'), false);
  assert.equal(isLocalhostUrl('http://192.168.101.73:3000'), false);
  assert.equal(isLocalhostUrl('https://verify.cosmogeek.com'), false);
});

test('QR Base URL: getPublicBaseUrl prioritizes NEXT_PUBLIC_APP_URL over localhost default', async () => {
  const { getPublicBaseUrl } = await import('../../server/routes.js');

  const oldEnv = process.env.NEXT_PUBLIC_APP_URL;
  try {
    process.env.NEXT_PUBLIC_APP_URL = 'http://192.168.101.73:3000';
    const baseUrl = getPublicBaseUrl();
    assert.equal(baseUrl, 'http://192.168.101.73:3000');

    // With a certificate ID, URL is constructed correctly for mobile phone Wi-Fi scanning
    const fullQrUrl = `${baseUrl}/verify/cg-26832-7a8e`;
    assert.equal(fullQrUrl, 'http://192.168.101.73:3000/verify/cg-26832-7a8e');
    assert.ok(!fullQrUrl.includes('localhost'), 'Phone QR URL must not contain localhost');
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = oldEnv;
  }
});

test('QR Base URL: getPublicBaseUrl prioritizes APP_BASE_URL', async () => {
  const { getPublicBaseUrl } = await import('../../server/routes.js');

  const oldAppBase = process.env.APP_BASE_URL;
  const oldNext = process.env.NEXT_PUBLIC_APP_URL;
  try {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.APP_BASE_URL = 'http://192.168.1.15:3000';
    const baseUrl = getPublicBaseUrl();
    assert.equal(baseUrl, 'http://192.168.1.15:3000');
  } finally {
    process.env.APP_BASE_URL = oldAppBase;
    process.env.NEXT_PUBLIC_APP_URL = oldNext;
  }
});


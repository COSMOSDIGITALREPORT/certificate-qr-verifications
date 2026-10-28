/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CertificateInputSchema,
  calculateInternshipDuration,
  formatDateToIndianStandard,
} from '../../server/validation.js';

test('CertificateInputSchema accepts valid input', () => {
  const validData = {
    recipientName: 'Yuvraj Dhumale',
    recipientEmail: 'yuvraj@example.com',
    designation: 'Jr. Software Developer',
    certificateType: 'Certificate of Completion',
    startDate: '2026-07-10',
    endDate: '2026-10-16',
    internshipDuration: '3 months',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director / Authorized Signatory',
    issueLocation: 'Nagpur, Maharashtra, India',
  };

  const result = CertificateInputSchema.safeParse(validData);
  assert.equal(result.success, true);
});

test('CertificateInputSchema rejects empty recipient name', () => {
  const invalidData = {
    recipientName: ' ',
    designation: 'Jr. Software Developer',
    startDate: '2026-07-10',
    endDate: '2026-10-16',
    internshipDuration: '3 months',
  };

  const result = CertificateInputSchema.safeParse(invalidData);
  assert.equal(result.success, false);
  if (!result.success) {
    const nameErr = result.error.issues.find((e) => e.path.includes('recipientName'));
    assert.ok(nameErr, 'Should have recipientName validation error');
  }
});

test('CertificateInputSchema rejects invalid date ranges (endDate before startDate)', () => {
  const invalidDates = {
    recipientName: 'Aarav Sharma',
    designation: 'Frontend Engineer',
    startDate: '2026-10-20',
    endDate: '2026-08-10', // End date before start date
    internshipDuration: '2 months',
  };

  const result = CertificateInputSchema.safeParse(invalidDates);
  assert.equal(result.success, false);
  if (!result.success) {
    const dateErr = result.error.issues.find((e) => e.path.includes('endDate'));
    assert.ok(dateErr, 'Should report error for end date preceding start date');
  }
});

test('calculateInternshipDuration calculates months accurately', () => {
  // 3 months
  const dur1 = calculateInternshipDuration('2026-07-10', '2026-10-16');
  assert.equal(dur1, '3 months');

  // 6 months
  const dur2 = calculateInternshipDuration('2026-01-01', '2026-07-01');
  assert.equal(dur2, '6 months');

  // Short duration in weeks
  const dur3 = calculateInternshipDuration('2026-05-01', '2026-05-15');
  assert.equal(dur3, '2 weeks');

  // Invalid date returns empty string
  const durInvalid = calculateInternshipDuration('invalid', '2026-10-16');
  assert.equal(durInvalid, '');
});

test('formatDateToIndianStandard formats YYYY-MM-DD to DD/MM/YYYY', () => {
  assert.equal(formatDateToIndianStandard('2026-10-16'), '16/10/2026');
  assert.equal(formatDateToIndianStandard('2026-07-10'), '10/07/2026');
});

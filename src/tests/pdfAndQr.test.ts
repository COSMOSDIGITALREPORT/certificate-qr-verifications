/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import {
  ensureMasterTemplateExists,
  inspectPdfTemplate,
  generateCertificatePdf,
} from '../../server/pdfEngine.js';
import { generateQrPngBuffer, generateQrDataUrl } from '../../server/qr.js';
import { Certificate } from '../types/index.js';

test('ensureMasterTemplateExists creates and preserves template without corruption', async () => {
  const templatePath = await ensureMasterTemplateExists();
  assert.ok(fs.existsSync(templatePath), 'Template file must exist');

  const inspection = await inspectPdfTemplate();
  assert.equal(inspection.pageCount, 1, 'Should have exactly 1 page');
  assert.equal(inspection.orientation, 'landscape', 'Certificate must be landscape');
  assert.ok(inspection.width >= 400, 'Page width should be landscape (>= 400 pt)');
});

test('generateQrPngBuffer returns valid PNG bytes', async () => {
  const testUrl = 'http://localhost:3000/verify/cg-test-1234';
  const qrBuffer = await generateQrPngBuffer(testUrl, 200);

  assert.ok(Buffer.isBuffer(qrBuffer), 'Must return a Node buffer');
  assert.ok(qrBuffer.length > 500, 'QR PNG buffer must have valid size');

  // PNG magic number check (\x89PNG\r\n\x1a\n)
  assert.equal(qrBuffer[0], 0x89);
  assert.equal(qrBuffer[1], 0x50); // P
  assert.equal(qrBuffer[2], 0x4e); // N
  assert.equal(qrBuffer[3], 0x47); // G
});

test('generateQrDataUrl returns formatted data URL', async () => {
  const dataUrl = await generateQrDataUrl('http://localhost:3000/verify/cg-test-1234', 150);
  assert.ok(dataUrl.startsWith('data:image/png;base64,'), 'Must be a valid PNG base64 data URL');
});

test('generateCertificatePdf generates valid PDF and embeds QR without overwriting template', async () => {
  const templatePath = await ensureMasterTemplateExists();
  const templateStatsBefore = fs.statSync(templatePath);

  const testCert: Certificate = {
    id: 'cert_test_99999',
    certificateNumber: '#99999',
    verificationId: 'cg-99999-abcdef',
    recipientName: 'Test Student Verification',
    recipientEmail: 'test@cosmogeek.com',
    designation: 'Software Developer Intern',
    certificateType: 'Certificate of Completion',
    internshipDuration: '3 months',
    startDate: '2026-06-01',
    endDate: '2026-09-01',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director / Authorized Signatory',
    issueLocation: 'Nagpur, Maharashtra, India',
    status: 'VALID',
    verificationPath: '/verify/cg-99999-abcdef',
    pdfPath: 'storage/certificates/99999.pdf',
    issuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await generateCertificatePdf(testCert, 'http://localhost:3000');
  assert.ok(result.pdfBuffer.length > 5000, 'Generated PDF must be non-empty');
  assert.ok(fs.existsSync(result.fullPath), 'Generated PDF file must exist in storage');

  // Verify generated PDF structure
  const loadedPdf = await PDFDocument.load(result.pdfBuffer);
  assert.equal(loadedPdf.getPageCount(), 1, 'Certificate must have 1 page');

  // Crucial check: verify original template was NOT overwritten
  const templateStatsAfter = fs.statSync(templatePath);
  assert.equal(
    templateStatsAfter.size,
    templateStatsBefore.size,
    'Original template file size must remain unmodified'
  );

  // Clean up test file
  if (fs.existsSync(result.fullPath)) {
    fs.unlinkSync(result.fullPath);
  }
});

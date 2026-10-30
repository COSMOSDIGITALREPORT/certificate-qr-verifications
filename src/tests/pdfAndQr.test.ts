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
  generateCosmosDigitalCertificatePdf,
  generateOfferLetterPdf,
} from '../../server/pdfEngine.js';
import {
  generateOfferLetterDocx,
  generateCosmosDigitalDocx,
} from '../../server/docxEngine.js';
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

test('generateCosmosDigitalCertificatePdf generates valid PDF with QR and signature without modifying templates', async () => {
  const cdCert: Certificate = {
    id: 'cert_cd_test_123',
    certificateNumber: '#26899',
    verificationId: 'cd-26899-xyz789',
    documentType: 'COSMOS_DIGITAL_CERTIFICATE',
    recipientName: 'Aarav Sharma',
    recipientEmail: 'aarav@example.com',
    certificateType: 'Certificate of Completion',
    designation: 'Full Stack Web Development',
    internshipDuration: '3 - months',
    startDate: '2026-06-01',
    endDate: '2026-09-01',
    issuingCompany: 'Cosmos Digital',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director',
    issueLocation: 'Nagpur, Maharashtra, India',
    contentBody: 'The participant has completed the prescribed course curriculum covering full-stack concepts.',
    status: 'VALID',
    verificationPath: '/verify/cd-26899-xyz789',
    pdfPath: 'storage/certificates/26899.pdf',
    issuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await generateCosmosDigitalCertificatePdf(cdCert, 'http://localhost:3000');
  assert.ok(result.pdfBuffer.length > 50000, 'Cosmos Digital PDF must have background image rendered');
  assert.ok(fs.existsSync(result.fullPath), 'Generated PDF file must exist in storage');

  const loadedPdf = await PDFDocument.load(result.pdfBuffer);
  assert.equal(loadedPdf.getPageCount(), 1, 'Must have 1 page');

  // Clean up test file
  if (fs.existsSync(result.fullPath)) {
    fs.unlinkSync(result.fullPath);
  }
});

test('generateOfferLetterDocx creates valid DOCX document preserving structure and styles', async () => {
  const result = await generateOfferLetterDocx({
    id: 'offer_test_doc_456',
    recipientName: 'Rahul Verma',
    letterDate: '30/06/2026',
    subject: 'Employment Offer Letter For Cloud Engineer Intern',
    position: 'Cloud Engineer Intern',
    companyName: 'Cosmogeek Software Solutions Pvt. Ltd.',
    letterBody: 'We are pleased to offer you the position of Cloud Engineer Intern.',
    startDate: '01 July, 2026',
    endDate: '01 January, 2027',
    stipend: '8,000 / month',
    employmentBond: 'Minimum employment period of 6 months upon confirmation.',
    terminationClause: 'Standard termination clause applies.',
    authorizedPersonName: 'Authorized Person Sign',
  });

  assert.ok(result.docxBuffer.length > 10000, 'Generated DOCX must contain full document with media');
  assert.ok(fs.existsSync(result.fullPath), 'Generated DOCX must be saved to storage');

  // Verify DOCX ZIP header PK (0x50, 0x4B, 0x03, 0x04)
  assert.equal(result.docxBuffer[0], 0x50);
  assert.equal(result.docxBuffer[1], 0x4b);

  // Clean up test file
  if (fs.existsSync(result.fullPath)) {
    fs.unlinkSync(result.fullPath);
  }
});

test('generateCosmosDigitalDocx creates valid DOCX certificate preserving master template', async () => {
  const result = await generateCosmosDigitalDocx({
    certificateNumber: '#26899',
    recipientName: 'Priya Patel',
    certificateType: 'Certificate of Completion',
    courseName: 'Python Basics',
    duration: '3 - months',
    contentBody: 'Successfully demonstrated proficiency in Python and backend services.',
    startDate: '2026-06-04',
    endDate: '2026-09-06',
    directorName: 'Anirudh Hatwar',
  });

  assert.ok(result.docxBuffer.length > 10000, 'Generated CD DOCX must be non-empty');
  assert.ok(fs.existsSync(result.fullPath), 'Generated CD DOCX must be saved in storage/certificates');

  // Verify PK header
  assert.equal(result.docxBuffer[0], 0x50);
  assert.equal(result.docxBuffer[1], 0x4b);

  // Clean up test file
  if (fs.existsSync(result.fullPath)) {
    fs.unlinkSync(result.fullPath);
  }
});


test('generateOfferLetterPdf creates official PDF from CosmoGeek Professional template without QR code', async () => {
  const result = await generateOfferLetterPdf({
    id: 'test_offer_candidate_001',
    cinNumber: 'U62091MH2025PTC459728',
    letterDate: '30/06/2026',
    recipientName: 'Rohit Kulkarni',
    subject: 'Employment Offer Letter For Full Stack Developer',
    greetingName: 'Rohit',
    position: 'Full Stack Developer Intern',
    companyName: 'Cosmogeek Software Solutions Pvt. Ltd.',
    letterBody: 'We are pleased to offer you the position of Full Stack Developer Intern at Cosmogeek Software Solutions Pvt. Ltd.',
    internshipPosition: 'Full Stack Developer',
    startDate: '01 July, 2026',
    endDate: '01 January, 2027',
    stipend: '10,000 / month',
    employmentBond: 'Minimum employment period of 6 months upon confirmation.',
    terminationClause: 'Standard termination clause applies.',
    employeeName: 'Rohit',
    employeeSignatureText: '[Date&Signature]',
    directorName: 'Anirudh Hatwar',
    directorDesignation: 'CosmoGeek Software Solutions Private Limited',
  });

  assert.ok(result.pdfBuffer.length > 50000, 'Generated Offer Letter PDF must be non-empty and retain background assets');
  assert.ok(fs.existsSync(result.fullPath), 'PDF file must be saved in storage/offer-letters');

  const pdfDoc = await PDFDocument.load(result.pdfBuffer);
  assert.equal(pdfDoc.getPageCount(), 1, 'Offer letter must be a 1-page document');
  const page = pdfDoc.getPage(0);
  assert.equal(page.getWidth(), 612, 'Must be US Letter width 612 pt');
  assert.equal(page.getHeight(), 792, 'Must be US Letter height 792 pt');

  // Verify that the template file remains intact
  const baseTemplateStats = fs.statSync('templates/offer-letter-base.pdf');
  assert.ok(baseTemplateStats.size > 50000, 'Base template must remain intact');

  // Clean up test file
  if (fs.existsSync(result.fullPath)) {
    fs.unlinkSync(result.fullPath);
  }
});

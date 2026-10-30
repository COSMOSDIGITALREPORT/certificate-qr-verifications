/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const TEMPLATES_DIR = path.resolve(process.cwd(), 'templates');
const STORAGE_OFFER_DIR = path.resolve(process.cwd(), 'storage/offer-letters');
const STORAGE_CERT_DIR = path.resolve(process.cwd(), 'storage/certificates');

export interface OfferLetterData {
  id: string;
  recipientName: string;
  letterDate: string;
  subject: string;
  position: string;
  companyName: string;
  letterBody?: string;
  startDate: string;
  endDate: string;
  stipend: string;
  employmentBond?: string;
  terminationClause?: string;
  authorizedPersonName?: string;
  signatoryRecipientName?: string;
}

export interface CosmosDigitalDocxData {
  id: string;
  recipientName: string;
  certificateType: string;
  courseName: string;
  duration: string;
  contentBody: string;
  startDate: string;
  endDate: string;
  certificateNumber: string;
  directorName: string;
  qrPngBuffer?: Buffer;
}

/**
 * Escapes XML special characters for safe insertion into Word document.xml
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates an editable DOCX Offer Letter from templates/offer-letter-template.docx
 */
export async function generateOfferLetterDocx(
  data: OfferLetterData
): Promise<{ docxBuffer: Buffer; relativePath: string; fullPath: string }> {
  const templatePath = path.join(TEMPLATES_DIR, 'offer-letter-template.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Offer letter template not found at templates/offer-letter-template.docx');
  }

  if (!fs.existsSync(STORAGE_OFFER_DIR)) {
    fs.mkdirSync(STORAGE_OFFER_DIR, { recursive: true });
  }

  const fileBytes = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(fileBytes);

  let xml = await zip.file('word/document.xml')!.async('string');

  const safeRecipient = escapeXml(data.recipientName.trim());
  const firstName = escapeXml(data.recipientName.trim().split(/\s+/)[0] || data.recipientName.trim());
  const safeDate = escapeXml(data.letterDate.trim());
  const safeSubject = escapeXml(data.subject.trim());
  const safePosition = escapeXml(data.position.trim());
  const safeCompany = escapeXml(data.companyName.trim());
  const safeStart = escapeXml(data.startDate.trim());
  const safeEnd = escapeXml(data.endDate.trim());
  const safeStipend = escapeXml(data.stipend.trim());
  const safeBond = escapeXml(
    (data.employmentBond || '').trim() ||
      'Upon confirmation as a full-time employee, you agree to commit to a minimum employment period of 6 months.'
  );
  const safeTerm = escapeXml(
    (data.terminationClause || '').trim() ||
      `${data.companyName} reserves the right to terminate your internship or full-time employment at any point, based on performance, conduct, or business needs.`
  );
  const safeAuth = escapeXml((data.authorizedPersonName || '').trim() || 'Authorized Person’s Sign');

  // Replace Date in header
  xml = xml.replace(/(<w:t[^>]*>)30\/06\/2026(<\/w:t>)/g, `$1${safeDate}$2`);

  // Replace To, Vedant Charde
  xml = xml.replace(/(<w:t[^>]*>)Vedant(<\/w:t>[\s\S]*?<w:t[^>]*>[\s\S]*?<\/w:t>[\s\S]*?<w:t[^>]*>)Charde(<\/w:t>)/, `$1${safeRecipient}$2$3`);
  xml = xml.replace(/(<w:bookmarkStart[^>]*w:name="To, )Vedant Charde(,")/g, `$1${safeRecipient}$2`);

  // Replace Subject line and Dear <firstName>
  xml = xml.replace(/Subject\s*:-\s*Employment\s*Offer\s*Letter\s*For\s*N8N\s*Automation/g, safeSubject);
  xml = xml.replace(/(<w:t[^>]*>)Dear Vedant,(<\/w:t>)/g, `$1Dear ${firstName},$2`);
  xml = xml.replace(/(<w:bookmarkStart[^>]*w:name="Dear )Vedant(,"[^>]*\/>)/g, `$1${firstName}$2`);

  // Replace Opening offer paragraph
  if (data.letterBody && data.letterBody.trim()) {
    const customBody = escapeXml(data.letterBody.trim());
    xml = xml.replace(
      /We are pleased to offer you the position of N8N Automation Intern at Cosmogeek Software Solutions Pvt\. Ltd\. We were impressed with your skills and believe that your passion and creativity will be a valuable additional to our team\./g,
      customBody
    );
  } else {
    xml = xml.replace(/N8N Automation Intern/g, safePosition);
    xml = xml.replace(/Cosmogeek Software Solutions Pvt\. Ltd\./g, safeCompany);
  }

  // Replace Internship Details
  xml = xml.replace(/(Position:-\s*)N8N Automation/g, `$1${safePosition}`);
  xml = xml.replace(/(Starting Date:-\s*)01 July, 2026/g, `$1${safeStart}`);
  xml = xml.replace(/(Ending Date:-\s*)01 January, 2027/g, `$1${safeEnd}`);
  xml = xml.replace(/(Stipend:-\s*)5,000 - 7,000 \(Based on your Performance\)/g, `$1${safeStipend}`);

  // Replace Terms & Conditions
  xml = xml.replace(
    /Upon confirmation as a full-time employee, you agree to commit to a minimum employment period of 6 months\./g,
    safeBond
  );
  xml = xml.replace(
    /Cosmogeek Software Solutions reserves the right to terminate your internship or full-time employment at any point, based on performance, conduct, or business needs\./g,
    safeTerm
  );

  // Replace Signatory table: "Mr. Vedant Charde" -> candidate name
  xml = xml.replace(/(<w:t[^>]*>)Mr\.(<\/w:t>[\s\S]*?<w:t[^>]*>[\s\S]*?<\/w:t>[\s\S]*?<w:t[^>]*>)Vedant(<\/w:t>[\s\S]*?<w:t[^>]*>[\s\S]*?<\/w:t>[\s\S]*?<w:t[^>]*>)Charde(<\/w:t>)/g, `$1$2${safeRecipient}$3$4`);
  xml = xml.replace(/Authorized Person’s Sign/g, safeAuth);

  zip.file('word/document.xml', xml);

  const cleanId = (data.id || 'offer-letter').replace(/[^a-zA-Z0-9_-]/g, '');
  const relativeFileName = `offer-${cleanId}.docx`;
  const fullFilePath = path.join(STORAGE_OFFER_DIR, relativeFileName);

  const docxBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  fs.writeFileSync(fullFilePath, docxBuffer);

  return {
    docxBuffer,
    relativePath: `storage/offer-letters/${relativeFileName}`,
    fullPath: fullFilePath,
  };
}

/**
 * Generates an editable DOCX Cosmos Digital Certificate from templates/cosmos-digital-certificate-template.docx
 */
export async function generateCosmosDigitalDocx(
  data: CosmosDigitalDocxData
): Promise<{ docxBuffer: Buffer; relativePath: string; fullPath: string }> {
  const templatePath = path.join(TEMPLATES_DIR, 'cosmos-digital-certificate-template.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Cosmos Digital template not found at templates/cosmos-digital-certificate-template.docx');
  }

  if (!fs.existsSync(STORAGE_CERT_DIR)) {
    fs.mkdirSync(STORAGE_CERT_DIR, { recursive: true });
  }

  const fileBytes = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(fileBytes);

  let xml = await zip.file('word/document.xml')!.async('string');

  const safeName = escapeXml(data.recipientName.trim());
  const safeType = escapeXml(data.certificateType.trim() || 'CERTIFICATE OF COMPLETION');
  const safeCourse = escapeXml(data.courseName.trim() || 'Python Basics');
  const safeDuration = escapeXml(data.duration.trim() || '3 - months');
  const safeBody = escapeXml(
    data.contentBody.trim() ||
      'The participant has completed the prescribed course curriculum covering relevant concepts, tools, and practical learning activities as applicable to the program. Well done!'
  );
  const safeStart = escapeXml(data.startDate.trim());
  const safeEnd = escapeXml(data.endDate.trim());
  const safeNum = escapeXml(data.certificateNumber.trim());
  const safeDirector = escapeXml(data.directorName.trim() || 'Anirudh Hatwar');

  // Replace Title
  xml = xml.replace(/CIRTIFICATE OF C<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>OMPLETION/g, safeType);

  // Replace Student Name (Tejas Sanjayrao Dandare)
  xml = xml.replace(/<w:t[^>]*>Tejas<\/w:t>[\s\S]*?<w:t[^>]*>Sanjayrao<\/w:t>[\s\S]*?<w:t[^>]*>Dandare<\/w:t>/g, `<w:t>${safeName}</w:t>`);

  // Replace Program duration
  xml = xml.replace(/3\s*-\s*months/g, safeDuration);

  // Replace Course name (Python Basics)
  xml = xml.replace(/<w:t[^>]*>Python<\/w:t>[\s\S]*?<w:t[^>]*>Basics<\/w:t>/g, `<w:t>${safeCourse}</w:t>`);

  // Replace Content body
  xml = xml.replace(
    /The participant has completed the prescribed course curriculum covering relevant concepts, tools, and practical learning activities as applicable to the program\.\s*Well done!/g,
    safeBody
  );

  // Replace Dates & Certificate number
  xml = xml.replace(/04\s*\/0\s*6\s*\/2026/g, safeStart);
  xml = xml.replace(/0\s*6\s*\/0\s*9\s*\/2026/g, safeEnd);
  xml = xml.replace(/#\s*TP\s*2\s*682\s*2/g, safeNum);

  // Replace Director name
  xml = xml.replace(/Anirudh<\/w:t>[\s\S]*?<w:t[^>]*>Hatwar<\/w:t>/g, `<w:t>${safeDirector}</w:t>`);

  zip.file('word/document.xml', xml);

  const cleanNum = (data.certificateNumber || 'CD').replace(/[^a-zA-Z0-9_-]/g, '');
  const relativeFileName = `${cleanNum}.docx`;
  const fullFilePath = path.join(STORAGE_CERT_DIR, relativeFileName);

  const docxBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  fs.writeFileSync(fullFilePath, docxBuffer);

  return {
    docxBuffer,
    relativePath: `storage/certificates/${relativeFileName}`,
    fullPath: fullFilePath,
  };
}


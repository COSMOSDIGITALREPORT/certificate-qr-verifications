/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Certificate, OfferLetterInput } from '../src/types/index.js';
import { generateQrPngBuffer } from './qr.js';
import { formatDateToIndianStandard, DEFAULT_CONTENT_BODY } from './validation.js';

function getLanIPv4(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

export function resolveEffectiveBaseUrl(providedUrl?: string): string {
  const isLocalhost = (str?: string) => {
    if (!str) return true;
    return str.includes('localhost') || str.includes('127.0.0.1') || str.includes('0.0.0.0') || str.includes('::1');
  };

  if (providedUrl && providedUrl.includes('onrender.com')) {
    const frontend =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      'https://certificate-qr-verifications.vercel.app';
    return frontend.trim().replace(/\/$/, '');
  }

  if (providedUrl && !isLocalhost(providedUrl)) {
    return providedUrl.trim().replace(/\/$/, '');
  }

  const envUrl =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.APP_URL;

  if (envUrl && !isLocalhost(envUrl)) {
    return envUrl.trim().replace(/\/$/, '');
  }

  const lanIp = getLanIPv4();
  const port = process.env.PORT || '3000';
  if (lanIp) {
    return `http://${lanIp}:${port}`;
  }

  return (providedUrl || envUrl || `http://localhost:${port}`).replace(/\/$/, '');
}

/**
 * Word-wraps text within a specified width, preserving explicit line breaks (\r?\n)
 */
export function wrapTextToLines(
  text: string,
  maxWidth: number,
  font: any,
  fontSize: number
): string[] {
  if (!text) return [];
  const paragraphs = text.split(/\r?\n/);
  const resultLines: string[] = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) {
      resultLines.push('');
      continue;
    }

    const words = trimmedPara.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}

const TEMPLATES_DIR = path.resolve(process.cwd(), 'templates');
const TEMPLATE_FILE = path.join(TEMPLATES_DIR, 'certificate-template.pdf');
const SIGNATURE_FILE = path.join(TEMPLATES_DIR, 'director-signature.png');
const STORAGE_DIR = path.resolve(process.cwd(), 'storage/certificates');
const UPLOADED_TEMPLATE_SOURCE = path.resolve(process.cwd(), 'public/assets/aistudio/Yuvraj_-_CERTIFICATE_70672610.pdf');
const FALLBACK_SIGNATURE_SOURCE = path.resolve(process.cwd(), 'public/assets/director-signature.png');
const OFFER_LETTERS_STORAGE_DIR = path.resolve(process.cwd(), 'storage/offer-letters');
const OFFER_LETTER_BASE_PDF = path.join(TEMPLATES_DIR, 'offer-letter-base.pdf');
const OFFER_LETTER_TEMPLATE_PDF = path.join(TEMPLATES_DIR, 'offer-letter-template.pdf');

// Default Dimensions
const A4_WIDTH = 841.89; // pt
const A4_HEIGHT = 595.28; // pt

/**
 * Ensures the master certificate template exists.
 * Priority 1: User-uploaded Cosmogeek template (Yuvraj_-_CERTIFICATE_70672610.pdf).
 * Priority 2: Existing templates/certificate-template.pdf.
 * Priority 3: Fallback synthesized corporate vector template.
 */
export async function ensureMasterTemplateExists(): Promise<string> {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }

  // Ensure director signature exists in templates directory
  if (fs.existsSync(FALLBACK_SIGNATURE_SOURCE) && !fs.existsSync(SIGNATURE_FILE)) {
    try {
      fs.copyFileSync(FALLBACK_SIGNATURE_SOURCE, SIGNATURE_FILE);
    } catch {}
  }

  // If user provided the source PDF, copy it to templates/certificate-template.pdf if not already identical
  if (fs.existsSync(UPLOADED_TEMPLATE_SOURCE)) {
    if (!fs.existsSync(TEMPLATE_FILE)) {
      fs.copyFileSync(UPLOADED_TEMPLATE_SOURCE, TEMPLATE_FILE);
      return TEMPLATE_FILE;
    }
  }

  if (fs.existsSync(TEMPLATE_FILE)) {
    return TEMPLATE_FILE;
  }

  // Synthesize vector fallback template if neither source is present
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: A4_WIDTH,
    height: A4_HEIGHT,
    color: rgb(0.985, 0.985, 0.99),
  });

  page.drawRectangle({
    x: 25,
    y: 25,
    width: A4_WIDTH - 50,
    height: A4_HEIGHT - 50,
    borderColor: rgb(0.04, 0.10, 0.20),
    borderWidth: 4,
  });

  const title = 'COSMOGEEK SOFTWARE SOLUTIONS PVT. LTD.';
  const titleW = fontBold.widthOfTextAtSize(title, 20);
  page.drawText(title, {
    x: (A4_WIDTH - titleW) / 2,
    y: A4_HEIGHT - 70,
    size: 20,
    font: fontBold,
    color: rgb(0.04, 0.10, 0.20),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(TEMPLATE_FILE, pdfBytes);
  return TEMPLATE_FILE;
}

/**
 * Inspects the master template and returns layout dimensions and characteristics
 */
export async function inspectPdfTemplate(): Promise<{
  pageCount: number;
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
  templatePath: string;
  isCustomUploaded: boolean;
}> {
  await ensureMasterTemplateExists();
  const fileBuffer = fs.readFileSync(TEMPLATE_FILE);
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  return {
    pageCount: pages.length,
    width: Math.round(width * 100) / 100,
    height: Math.round(height * 100) / 100,
    orientation: width >= height ? 'landscape' : 'portrait',
    templatePath: TEMPLATE_FILE,
    isCustomUploaded: fs.existsSync(UPLOADED_TEMPLATE_SOURCE) || fs.existsSync(TEMPLATE_FILE),
  };
}

/**
 * Generates a certificate PDF for a given student record using the template.
 * NEVER overwrites the original template file in templates/certificate-template.pdf.
 * Uses exact precision background clearance to prevent overlapping text.
 */
export async function generateCertificatePdf(
  cert: Certificate,
  publicBaseUrl: string
): Promise<{ pdfBuffer: Buffer; relativePath: string; fullPath: string }> {
  await ensureMasterTemplateExists();

  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  // Load template into memory (NEVER overwrite original template)
  const templateBytes = fs.readFileSync(TEMPLATE_FILE);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const cleanNum = cert.certificateNumber.replace(/[^a-zA-Z0-9]/g, '');
  const relativeFileName = `${cleanNum}.pdf`;
  const fullFilePath = path.join(STORAGE_DIR, relativeFileName);

  const effectiveBaseUrl = resolveEffectiveBaseUrl(publicBaseUrl);
  const verificationUrl = `${effectiveBaseUrl}/verify/${cert.verificationId}`;
  const formattedStart = formatDateToIndianStandard(cert.startDate);
  const formattedEnd = formatDateToIndianStandard(cert.endDate);

  // Check if template is the Cosmogeek source template (~419.52 x 297.96 pt)
  if (width < 500) {
    // ---------------------------------------------------------------
    // COSMOGEEK OFFICIAL TEMPLATE PLACEMENT (419.52 x 297.96 pt)
    // ---------------------------------------------------------------
    const pureWhite = rgb(1, 1, 1);
    const tealAccent = rgb(0.0, 0.40, 0.48); // #00667A Cosmogeek Teal
    const darkText = rgb(0.1, 0.1, 0.1);
    const dateTeal = rgb(0.0, 0.50, 0.55);

    // 1. Clean and draw Certificate Title
    page.drawRectangle({
      x: 55,
      y: 211,
      width: 220,
      height: 16,
      color: pureWhite,
    });
    page.drawText((cert.certificateType || 'CERTIFICATE OF COMPLETION').toUpperCase(), {
      x: 58,
      y: 214,
      size: 9.5,
      font: fontBold,
      color: darkText,
    });

    // 2. Clean dynamic middle student block
    page.drawRectangle({
      x: 55,
      y: 125,
      width: 250,
      height: 85,
      color: pureWhite,
    });

    // 3. Draw Recipient Name (with auto-scaling for long names)
    let nameSize = 16;
    if (cert.recipientName.length > 22) nameSize = 13.5;
    if (cert.recipientName.length > 30) nameSize = 11.5;

    page.drawText(cert.recipientName, {
      x: 58,
      y: 196,
      size: nameSize,
      font: fontBold,
      color: tealAccent,
    });

    // 4. Draw Internship Duration
    const durationText = `Successfully completed a ${cert.internshipDuration} internship`;
    page.drawText(durationText, {
      x: 58,
      y: 183,
      size: 9.5,
      font: fontRegular,
      color: darkText,
    });

    // 5. Draw Designation / Role
    page.drawText('As ', {
      x: 58,
      y: 169,
      size: 12,
      font: fontBold,
      color: darkText,
    });

    let roleSize = 12;
    if (cert.designation.length > 24) roleSize = 10.5;
    page.drawText(cert.designation, {
      x: 77,
      y: 169,
      size: roleSize,
      font: fontBold,
      color: darkText,
    });

    // 6. Draw Commendation Body Text (Editable Content Body)
    const effectiveBody = (cert.contentBody && cert.contentBody.trim()) || DEFAULT_CONTENT_BODY;
    const bodyLines = wrapTextToLines(effectiveBody, 220, fontRegular, 7.2);
    const startY = 157;
    const lineHeight = bodyLines.length > 4 ? 8.2 : 9.0;
    const bodyFontSize = bodyLines.length > 5 ? 6.5 : 7.2;

    bodyLines.forEach((lineText, idx) => {
      if (lineText && lineText.trim()) {
        page.drawText(lineText, {
          x: 58,
          y: startY - idx * lineHeight,
          size: bodyFontSize,
          font: fontRegular,
          color: darkText,
        });
      }
    });

    // 7. Clean and Draw Bottom-Left Dates & Certificate Number
    page.drawRectangle({
      x: 54,
      y: 58,
      width: 140,
      height: 32,
      color: pureWhite,
    });

    page.drawText(`Start Date :- ${formattedStart}`, {
      x: 58,
      y: 81,
      size: 7.5,
      font: fontBold,
      color: dateTeal,
    });

    page.drawText(`End Date :- ${formattedEnd}`, {
      x: 58,
      y: 72,
      size: 7.5,
      font: fontBold,
      color: dateTeal,
    });

    page.drawText(`Certificate No. :- ${cert.certificateNumber}`, {
      x: 58,
      y: 63,
      size: 7.5,
      font: fontBold,
      color: dateTeal,
    });

    // 7. Embed High-Contrast QR Code in Right Accent Column
    const qrBuffer = await generateQrPngBuffer(verificationUrl, 240);
    const embeddedQrImage = await pdfDoc.embedPng(qrBuffer);

    const qrX = 328;
    const qrY = 145;
    const qrSize = 58;

    // Protective white card with teal border
    page.drawRectangle({
      x: qrX - 2,
      y: qrY - 14,
      width: qrSize + 4,
      height: qrSize + 18,
      color: pureWhite,
      borderColor: dateTeal,
      borderWidth: 0.8,
    });

    page.drawImage(embeddedQrImage, {
      x: qrX,
      y: qrY - 2,
      width: qrSize,
      height: qrSize,
    });

    page.drawText('SCAN TO VERIFY', {
      x: qrX + 3.5,
      y: qrY - 11,
      size: 5.5,
      font: fontBold,
      color: tealAccent,
    });

    // 8. Embed Director's Digital Signature directly above "Anirudh Hatwar"
    let sigBuffer: Buffer | null = null;
    if (fs.existsSync(SIGNATURE_FILE)) {
      sigBuffer = fs.readFileSync(SIGNATURE_FILE);
    } else if (fs.existsSync(FALLBACK_SIGNATURE_SOURCE)) {
      sigBuffer = fs.readFileSync(FALLBACK_SIGNATURE_SOURCE);
    }

    if (sigBuffer) {
      try {
        const embeddedSig = await pdfDoc.embedPng(sigBuffer);
        page.drawImage(embeddedSig, {
          x: 224,
          y: 84,
          width: 62,
          height: 38.8,
        });
      } catch (err) {
        console.warn('[Cosmogeek PDF Engine] Could not embed director signature:', err);
      }
    }
  } else {
    // ---------------------------------------------------------------
    // FALLBACK A4 LANDSCAPE PLACEMENT (841.89 x 595.28 pt)
    // ---------------------------------------------------------------
    const coverColor = rgb(0.985, 0.985, 0.99);

    // Certificate Number
    page.drawRectangle({ x: width - 240, y: height - 75, width: 180, height: 25, color: coverColor });
    page.drawText(`Certificate No: ${cert.certificateNumber}`, {
      x: width - 210,
      y: height - 66,
      size: 11,
      font: fontBold,
      color: rgb(0.04, 0.10, 0.20),
    });

    // Recipient Name
    page.drawRectangle({ x: (width - 600) / 2, y: 300, width: 600, height: 55, color: coverColor });
    const nameW = fontBold.widthOfTextAtSize(cert.recipientName, 26);
    page.drawText(cert.recipientName, {
      x: (width - nameW) / 2,
      y: 315,
      size: 26,
      font: fontBold,
      color: rgb(0.04, 0.10, 0.20),
    });

    // Body
    page.drawRectangle({ x: (width - 680) / 2, y: 215, width: 680, height: 75, color: coverColor });
    const bodyL1 = `Successfully completed a ${cert.internshipDuration} internship as ${cert.designation}`;
    const bodyL2 = `at ${cert.issuingCompany} from ${formattedStart} to ${formattedEnd}.`;
    page.drawText(bodyL1, { x: (width - fontRegular.widthOfTextAtSize(bodyL1, 13)) / 2, y: 260, size: 13, font: fontRegular, color: rgb(0.15, 0.20, 0.28) });
    page.drawText(bodyL2, { x: (width - fontRegular.widthOfTextAtSize(bodyL2, 13)) / 2, y: 242, size: 13, font: fontRegular, color: rgb(0.15, 0.20, 0.28) });

    // Dates
    page.drawRectangle({ x: 70, y: 65, width: 230, height: 65, color: coverColor });
    page.drawText(`Start Date: ${formattedStart}`, { x: 75, y: 100, size: 9, font: fontRegular, color: rgb(0.3, 0.35, 0.42) });
    page.drawText(`End Date: ${formattedEnd}`, { x: 75, y: 87, size: 9, font: fontRegular, color: rgb(0.3, 0.35, 0.42) });
    page.drawText(`ID: ${cert.verificationId}`, { x: 75, y: 74, size: 8.5, font: fontRegular, color: rgb(0.5, 0.55, 0.62) });

    // QR
    const qrBuffer = await generateQrPngBuffer(verificationUrl, 260);
    const embeddedQrImage = await pdfDoc.embedPng(qrBuffer);
    page.drawImage(embeddedQrImage, { x: (width - 86) / 2, y: 64, width: 86, height: 86 });

    // Director signature for fallback template
    let sigBuffer: Buffer | null = null;
    if (fs.existsSync(SIGNATURE_FILE)) {
      sigBuffer = fs.readFileSync(SIGNATURE_FILE);
    } else if (fs.existsSync(FALLBACK_SIGNATURE_SOURCE)) {
      sigBuffer = fs.readFileSync(FALLBACK_SIGNATURE_SOURCE);
    }
    if (sigBuffer) {
      try {
        const embeddedSig = await pdfDoc.embedPng(sigBuffer);
        page.drawImage(embeddedSig, {
          x: width - 260,
          y: 95,
          width: 90,
          height: 56.3,
        });
      } catch {}
    }
  }

  // Save generated PDF to storage directory
  const finalPdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(finalPdfBytes);
  fs.writeFileSync(fullFilePath, pdfBuffer);

  return {
    pdfBuffer,
    relativePath: `storage/certificates/${relativeFileName}`,
    fullPath: fullFilePath,
  };
}

const COSMOS_DIGITAL_BASE_PDF = path.join(TEMPLATES_DIR, 'cosmos-digital-base.pdf');
const COSMOS_DIGITAL_BG = path.join(TEMPLATES_DIR, 'cosmos-digital-bg.png');
const COSMOS_DIGITAL_LOGO = path.join(TEMPLATES_DIR, 'cosmos-digital-logo.png');

/**
 * Generates a Cosmos Digital Certificate PDF with dynamic QR verification and director signature.
 * Faithfully preserves the original master template from Sample CD CERTIFICATE.docx.
 */
export async function generateCosmosDigitalCertificatePdf(
  cert: Certificate,
  publicBaseUrl: string
): Promise<{ pdfBuffer: Buffer; relativePath: string; fullPath: string }> {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }

  let pdfDoc: PDFDocument;
  let page: any;
  let width: number;
  let height: number;

  if (fs.existsSync(COSMOS_DIGITAL_BASE_PDF)) {
    const templateBytes = fs.readFileSync(COSMOS_DIGITAL_BASE_PDF);
    pdfDoc = await PDFDocument.load(templateBytes);
    page = pdfDoc.getPage(0);
    const size = page.getSize();
    width = size.width;
    height = size.height;
  } else {
    // Fallback if base PDF is not found
    width = 792;
    height = 612;
    pdfDoc = await PDFDocument.create();
    page = pdfDoc.addPage([width, height]);

    if (fs.existsSync(COSMOS_DIGITAL_BG)) {
      const bgBytes = fs.readFileSync(COSMOS_DIGITAL_BG);
      const bgImg = await pdfDoc.embedPng(bgBytes);
      page.drawImage(bgImg, { x: 0, y: 0, width, height });
    } else {
      page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.99, 1.0) });
    }

    if (fs.existsSync(COSMOS_DIGITAL_LOGO)) {
      try {
        const logoBytes = fs.readFileSync(COSMOS_DIGITAL_LOGO);
        const logoImg = await pdfDoc.embedPng(logoBytes);
        page.drawImage(logoImg, { x: width - 180, y: 40, width: 100, height: 44 });
      } catch {}
    }
  }

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  if (width < 500) {
    // -----------------------------------------------------------------
    // ORIGINAL COSMOS DIGITAL MASTER DESIGN (419.52 x 297.96 pt)
    // -----------------------------------------------------------------
    const toPdfY = (pyY: number, fontSize = 10) => height - pyY - fontSize * 0.8;
    const tealColor = rgb(24 / 255, 138 / 255, 135 / 255); // #188a87
    const blackColor = rgb(0, 0, 0);

    // 1. Certificate Title Heading
    const titleText = (cert.certificateType || 'CERTIFICATE OF COMPLETION').toUpperCase();
    page.drawText(titleText, {
      x: 49.6,
      y: toPdfY(71.7, 12),
      size: 12,
      font: fontBold,
      color: blackColor,
    });

    // 2. Student Full Name (in Teal #188a87)
    let nameSize = 14;
    if (cert.recipientName.length > 25) nameSize = 12;
    if (cert.recipientName.length > 35) nameSize = 10.5;
    page.drawText(cert.recipientName, {
      x: 49.6,
      y: toPdfY(86.8, nameSize),
      size: nameSize,
      font: fontBold,
      color: tealColor,
    });

    // 3. Program intro
    const duration = cert.internshipDuration || '3 - months';
    const introText = `For Successful Completion Of ${duration} Course & Training Program in`;
    page.drawText(introText, {
      x: 49.6,
      y: toPdfY(103.2, 8),
      size: 8,
      font: fontRegular,
      color: blackColor,
    });

    // 4. Course / Training Program Name
    const course = cert.designation || 'Python Basics';
    page.drawText(course, {
      x: 49.6,
      y: toPdfY(113.8, 11.5),
      size: 11.5,
      font: fontBold,
      color: blackColor,
    });

    // 5. Description / Content Body
    const effectiveBody =
      (cert.contentBody && cert.contentBody.trim()) ||
      'The participant has completed the prescribed course curriculum covering relevant concepts, tools, and practical learning activities as applicable to the program. Well done!';
    const bodyLines = wrapTextToLines(effectiveBody, 215, fontRegular, 7);
    let curBodyY = 127.9;
    const lineHeight = bodyLines.length > 5 ? 8.2 : 9.3;
    for (const line of bodyLines) {
      if (line && line.trim()) {
        page.drawText(line, {
          x: 57.6,
          y: toPdfY(curBodyY, 7),
          size: 7,
          font: fontRegular,
          color: blackColor,
        });
      }
      curBodyY += lineHeight;
    }

    // 6. Dates & Certificate Number
    const formattedStart = formatDateToIndianStandard(cert.startDate);
    const formattedEnd = formatDateToIndianStandard(cert.endDate);
    page.drawText(`Start Date :- ${formattedStart}`, {
      x: 57.6,
      y: toPdfY(210.9, 6),
      size: 6,
      font: fontBold,
      color: tealColor,
    });
    page.drawText(`End Date :- ${formattedEnd}`, {
      x: 57.6,
      y: toPdfY(218.8, 6),
      size: 6,
      font: fontBold,
      color: tealColor,
    });
    page.drawText(`Certificate No. :- ${cert.certificateNumber}`, {
      x: 57.6,
      y: toPdfY(226.8, 6),
      size: 6,
      font: fontBold,
      color: tealColor,
    });

    // 7. Director Name & Title
    const director = cert.signatoryName || 'Anirudh Hatwar';
    page.drawText(director, {
      x: 219.8,
      y: toPdfY(212.7, 10.6),
      size: 10.6,
      font: fontBold,
      color: tealColor,
    });
    page.drawText(cert.signatoryRole || 'Director', {
      x: 244.8,
      y: toPdfY(224.8, 8),
      size: 8,
      font: fontBold,
      color: tealColor,
    });

    // 8. Director Digital Signature directly above Anirudh Hatwar
    let sigBuffer: Buffer | null = null;
    if (fs.existsSync(SIGNATURE_FILE)) {
      sigBuffer = fs.readFileSync(SIGNATURE_FILE);
    } else if (fs.existsSync(FALLBACK_SIGNATURE_SOURCE)) {
      sigBuffer = fs.readFileSync(FALLBACK_SIGNATURE_SOURCE);
    }
    if (sigBuffer) {
      try {
        const sigImg = await pdfDoc.embedPng(sigBuffer);
        page.drawImage(sigImg, {
          x: 226,
          y: toPdfY(206, 26),
          width: 48,
          height: 26,
        });
      } catch (err) {
        console.warn('[Cosmos Digital] Could not embed director signature:', err);
      }
    }

    // 9. QR Code in right-side teal vertical ribbon with crisp SCAN TO VERIFY
    const effectiveBaseUrl = resolveEffectiveBaseUrl(publicBaseUrl);
    const verificationUrl = `${effectiveBaseUrl}/verify/${cert.verificationId}`;
    const qrBuffer = await generateQrPngBuffer(verificationUrl, 200);
    const qrImg = await pdfDoc.embedPng(qrBuffer);

    const ribbonCenterX = 363;
    const qrSize = 56;
    const qrX = ribbonCenterX - qrSize / 2;
    const qrY = height - 120;

    // Clean, crisp white card backing for high contrast without irregular shapes
    page.drawRectangle({
      x: qrX - 2,
      y: qrY - 2,
      width: qrSize + 4,
      height: qrSize + 4,
      color: rgb(1, 1, 1),
    });

    page.drawImage(qrImg, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // SCAN TO VERIFY label below QR code
    const scanLabel = 'SCAN TO VERIFY';
    const labelWidth = fontBold.widthOfTextAtSize(scanLabel, 5.5);
    page.drawText(scanLabel, {
      x: ribbonCenterX - labelWidth / 2,
      y: qrY - 9,
      size: 5.5,
      font: fontBold,
      color: rgb(1, 1, 1), // Crisp white text on teal ribbon
    });
  } else {
    // -----------------------------------------------------------------
    // FALLBACK 792x612 PLACEMENT
    // -----------------------------------------------------------------
    const titleText = (cert.certificateType || 'CERTIFICATE OF COMPLETION').toUpperCase();
    page.drawText(titleText, {
      x: 75,
      y: height - 138,
      size: 15,
      font: fontBold,
      color: rgb(0.04, 0.20, 0.35),
    });

    let nameSize = 24;
    if (cert.recipientName.length > 25) nameSize = 19;
    if (cert.recipientName.length > 35) nameSize = 16;
    page.drawText(cert.recipientName, {
      x: 75,
      y: height - 188,
      size: nameSize,
      font: fontBold,
      color: rgb(0.09, 0.54, 0.53),
    });

    const duration = cert.internshipDuration || '3 - months';
    page.drawText(`For Successful Completion Of ${duration} Course & Training Program in`, {
      x: 75,
      y: height - 216,
      size: 11.5,
      font: fontRegular,
      color: rgb(0.2, 0.25, 0.3),
    });

    const course = cert.designation || 'Python Basics';
    page.drawText(course, {
      x: 75,
      y: height - 245,
      size: 17,
      font: fontBold,
      color: rgb(0.05, 0.15, 0.25),
    });

    const effectiveBody =
      (cert.contentBody && cert.contentBody.trim()) ||
      'The participant has completed the prescribed course curriculum covering relevant concepts, tools, and practical learning activities as applicable to the program. Well done!';
    const bodyLines = wrapTextToLines(effectiveBody, 460, fontRegular, 9.5);
    bodyLines.slice(0, 4).forEach((line, idx) => {
      page.drawText(line, {
        x: 75,
        y: height - 275 - idx * 13,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.25, 0.3, 0.38),
      });
    });

    const formattedStart = formatDateToIndianStandard(cert.startDate);
    const formattedEnd = formatDateToIndianStandard(cert.endDate);
    page.drawText(
      `Start Date :- ${formattedStart}   End Date :- ${formattedEnd}   Certificate No. :- ${cert.certificateNumber}`,
      {
        x: 75,
        y: 115,
        size: 9.5,
        font: fontBold,
        color: rgb(0.09, 0.54, 0.53),
      }
    );

    const director = cert.signatoryName || 'Anirudh Hatwar';
    page.drawText(director, {
      x: 430,
      y: 120,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(cert.signatoryRole || 'Director', {
      x: 430,
      y: 105,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    let sigBuffer: Buffer | null = null;
    if (fs.existsSync(SIGNATURE_FILE)) {
      sigBuffer = fs.readFileSync(SIGNATURE_FILE);
    } else if (fs.existsSync(FALLBACK_SIGNATURE_SOURCE)) {
      sigBuffer = fs.readFileSync(FALLBACK_SIGNATURE_SOURCE);
    }
    if (sigBuffer) {
      try {
        const embeddedSig = await pdfDoc.embedPng(sigBuffer);
        page.drawImage(embeddedSig, {
          x: 420,
          y: 135,
          width: 80,
          height: 50,
        });
      } catch {}
    }

    const effectiveBaseUrl = resolveEffectiveBaseUrl(publicBaseUrl);
    const verificationUrl = `${effectiveBaseUrl}/verify/${cert.verificationId}`;
    const qrBuffer = await generateQrPngBuffer(verificationUrl, 260);
    const embeddedQr = await pdfDoc.embedPng(qrBuffer);

    page.drawRectangle({
      x: 597,
      y: 428,
      width: 72,
      height: 72,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.09, 0.54, 0.53),
      borderWidth: 1,
    });

    page.drawImage(embeddedQr, {
      x: 601,
      y: 432,
      width: 64,
      height: 64,
    });
  }

  const cleanNum = cert.certificateNumber.replace(/[^a-zA-Z0-9]/g, '');
  const relativeFileName = `${cleanNum}.pdf`;
  const fullFilePath = path.join(STORAGE_DIR, relativeFileName);

  const finalPdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(finalPdfBytes);
  fs.writeFileSync(fullFilePath, pdfBuffer);

  return {
    pdfBuffer,
    relativePath: `storage/certificates/${relativeFileName}`,
    fullPath: fullFilePath,
  };
}


export interface GeneratedOfferLetterResult {
  pdfBuffer: Buffer;
  relativePath: string;
  fullPath: string;
  filename: string;
}

/**
 * Generates an Offer Letter PDF from the new CosmoGeek Professional PDF template.
 * STRICT: Does NOT add any QR code, scanner link, or verification ID.
 */
export async function generateOfferLetterPdf(
  input: OfferLetterInput & { id?: string }
): Promise<GeneratedOfferLetterResult> {
  if (!fs.existsSync(OFFER_LETTERS_STORAGE_DIR)) {
    fs.mkdirSync(OFFER_LETTERS_STORAGE_DIR, { recursive: true });
  }

  // Load the base letterhead template (with logos, watermark, and footer intact)
  let templatePath = OFFER_LETTER_BASE_PDF;
  if (!fs.existsSync(templatePath)) {
    templatePath = OFFER_LETTER_TEMPLATE_PDF;
  }
  if (!fs.existsSync(templatePath)) {
    throw new Error('Offer Letter base PDF template not found in templates directory');
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const primaryColor = rgb(23 / 255, 43 / 255, 58 / 255); // #172b3a
  const darkColor = rgb(22 / 255, 22 / 255, 22 / 255); // #161616

  // Coordinate helper: PyMuPDF y -> pdf-lib y (from bottom of 792 pt page)
  const toPdfY = (pyY: number, fontSize = 11) => 792 - pyY - fontSize * 0.85;

  // 1. CIN Number & Letter Date
  const rawCin = input.cinNumber || 'U62091MH2025PTC459728';
  const cinText = rawCin.startsWith('CIN No:') ? rawCin : `CIN No: ${rawCin}`;
  page.drawText(cinText, {
    x: 56.2,
    y: toPdfY(115.2, 11),
    size: 11,
    font: fontBold,
    color: darkColor,
  });

  const rawDate = input.letterDate || '30/06/2026';
  const dateText = rawDate.startsWith('Date:') ? rawDate : `Date: ${rawDate}`;
  const dateWidth = fontBold.widthOfTextAtSize(dateText, 12);
  page.drawText(dateText, {
    x: 554.7 - dateWidth,
    y: toPdfY(114.3, 12),
    size: 12,
    font: fontBold,
    color: darkColor,
  });

  // 2. To & Recipient Full Name
  page.drawText('To,', {
    x: 56.2,
    y: toPdfY(141.0, 11),
    size: 11,
    font: fontRegular,
    color: primaryColor,
  });

  const recipientFormatted = input.recipientName.endsWith(',') ? input.recipientName : `${input.recipientName},`;
  page.drawText(recipientFormatted, {
    x: 56.2,
    y: toPdfY(162.5, 11),
    size: 11,
    font: fontRegular,
    color: primaryColor,
  });

  // 3. Subject
  const subjectText = input.subject || 'Employment Offer Letter For N8N Automation';
  page.drawText('Subject :-', {
    x: 56.2,
    y: toPdfY(205.3, 11),
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  page.drawText(subjectText, {
    x: 108.0,
    y: toPdfY(205.3, 11),
    size: 11,
    font: fontRegular,
    color: primaryColor,
  });

  // 4. Greeting Name
  const greeting = input.greetingName
    ? `Dear ${input.greetingName},`
    : `Dear ${input.recipientName.trim().split(/\s+/)[0]},`;
  page.drawText(greeting, {
    x: 56.2,
    y: toPdfY(236.8, 11),
    size: 11,
    font: fontBold,
    color: primaryColor,
  });

  // 5. Offer Letter Introduction / Body
  const defaultBody =
    'We are pleased to offer you the position of N8N Automation Intern at Cosmogeek Software Solutions Pvt. Ltd. We were impressed with your skills and believe that your passion and creativity will be a valuable additional to our team.';
  const bodyText = (input.letterBody || defaultBody).trim();
  const maxWidth = 555 - 56.2;
  const introLines = wrapTextToLines(bodyText, maxWidth, fontRegular, 11);
  let curY = 274.2;
  const lineHeight = 15.6;

  for (const line of introLines) {
    if (line) {
      page.drawText(line, {
        x: 56.2,
        y: toPdfY(curY, 11),
        size: 11,
        font: fontRegular,
        color: primaryColor,
      });
    }
    curY += lineHeight;
  }

  // 6. Internship Details
  curY = Math.max(curY + 12, 348.7);
  page.drawText('Internship Details:-', {
    x: 56.2,
    y: toPdfY(curY, 12),
    size: 12,
    font: fontBold,
    color: primaryColor,
  });

  const effectiveStipend =
    input.stipend ||
    (input.stipendAmount
      ? `${input.stipendAmount} ${input.stipendConditions || ''}`.trim()
      : '5,000 - 7,000 (Based on your Performance)');

  const details = [
    { label: 'Position', value: input.position || input.internshipPosition || 'N8N Automation' },
    { label: 'Starting Date', value: input.startDate || '01 July, 2026' },
    { label: 'Ending Date', value: input.endDate || '01 January, 2027' },
    { label: 'Stipend', value: effectiveStipend },
  ];

  curY += 20;
  for (const item of details) {
    page.drawText(item.label, {
      x: 56.2,
      y: toPdfY(curY, 11),
      size: 11,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(':-', {
      x: 128.2,
      y: toPdfY(curY, 11),
      size: 11,
      font: fontBold,
      color: primaryColor,
    });
    page.drawText(item.value, {
      x: 140.0,
      y: toPdfY(curY, 11),
      size: 11,
      font: fontRegular,
      color: primaryColor,
    });
    curY += 18;
  }

  // 7. Terms & Conditions
  curY = Math.max(curY + 14, 474.8);
  page.drawText('Terms & Conditions:', {
    x: 56.2,
    y: toPdfY(curY, 12),
    size: 12,
    font: fontBold,
    color: darkColor,
  });

  curY += 20;
  // 1. Employment Bond
  page.drawText('1.', {
    x: 56.2,
    y: toPdfY(curY, 10.8),
    size: 10.8,
    font: fontBold,
    color: primaryColor,
  });
  const bondFull = `Employment Bond: ${input.employmentBond || 'Upon confirmation as a full-time employee, you agree to commit to a minimum employment period of 6 months.'}`;
  const bondLines = wrapTextToLines(bondFull, maxWidth - 18, fontBold, 10.8);
  for (const bLine of bondLines) {
    page.drawText(bLine, {
      x: 74.2,
      y: toPdfY(curY, 10.8),
      size: 10.8,
      font: fontBold,
      color: darkColor,
    });
    curY += 14.5;
  }

  // 2. Termination Clause
  page.drawText('2.', {
    x: 56.2,
    y: toPdfY(curY, 10.8),
    size: 10.8,
    font: fontBold,
    color: primaryColor,
  });
  const termFull = `Termination Clause: ${input.terminationClause || 'Cosmogeek Software Solutions reserves the right to terminate your internship or full-time employment at any point, based on performance, conduct, or business needs.'}`;
  const termLines = wrapTextToLines(termFull, maxWidth - 18, fontBold, 10.8);
  for (const tLine of termLines) {
    page.drawText(tLine, {
      x: 74.2,
      y: toPdfY(curY, 10.8),
      size: 10.8,
      font: fontBold,
      color: darkColor,
    });
    curY += 14.5;
  }

  // 8. Bottom Signatures
  // Left: Employee
  const empName = input.employeeName || input.recipientName.trim().split(/\s+/)[0];
  page.drawText(empName, {
    x: 96.6,
    y: toPdfY(647.9, 11),
    size: 11,
    font: fontBold,
    color: primaryColor,
  });
  const empSigText = input.employeeSignatureText || '[Date&Signature]';
  page.drawText(empSigText, {
    x: 74.2,
    y: toPdfY(663.4, 11),
    size: 11,
    font: fontRegular,
    color: primaryColor,
  });

  // Right: Director
  const dirName = input.directorName || 'Anirudh Hatwar';
  const dirWidth = fontBold.widthOfTextAtSize(dirName, 11);
  page.drawText(dirName, {
    x: 454 - dirWidth / 2,
    y: toPdfY(647.9, 11),
    size: 11,
    font: fontBold,
    color: primaryColor,
  });

  const dirDesig = input.directorDesignation || 'CosmoGeek Software Solutions Private Limited';
  const desigWidth = fontRegular.widthOfTextAtSize(dirDesig, 11);
  page.drawText(dirDesig, {
    x: 554.7 - desigWidth,
    y: toPdfY(663.4, 11),
    size: 11,
    font: fontRegular,
    color: primaryColor,
  });

  // Save PDF file
  const docId = input.id || `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanCandidate = input.recipientName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Offer_Letter_${cleanCandidate}_${docId.slice(-6)}.pdf`;
  const fullFilePath = path.join(OFFER_LETTERS_STORAGE_DIR, filename);

  const finalPdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(finalPdfBytes);
  fs.writeFileSync(fullFilePath, pdfBuffer);

  return {
    pdfBuffer,
    relativePath: `storage/offer-letters/${filename}`,
    fullPath: fullFilePath,
    filename,
  };
}

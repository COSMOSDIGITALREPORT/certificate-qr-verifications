/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';

export interface GenerateQrOptions {
  verificationUrl: string;
  width?: number;
  margin?: number;
}

/**
 * Generates a PNG buffer containing a high-contrast QR code for the verification URL.
 * Error correction level 'M' or 'H' ensures readability even when printed or scanned by mobile cameras.
 */
export async function generateQrPngBuffer(url: string, size = 300): Promise<Buffer> {
  return await QRCode.toBuffer(url, {
    type: 'png',
    width: size,
    margin: 2,
    color: {
      dark: '#0A192F', // Deep navy
      light: '#FFFFFF', // Clean white quiet zone
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Generates a Base64 data URL representation of the QR code for instant UI previews.
 */
export async function generateQrDataUrl(url: string, size = 250): Promise<string> {
  return await QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    color: {
      dark: '#0A192F',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
}

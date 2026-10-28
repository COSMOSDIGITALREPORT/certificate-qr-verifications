import 'dotenv/config';
import { getDatabase, getAllCertificates } from '../server/db.js';
import { generateCertificatePdf } from '../server/pdfEngine.js';
import { getPublicBaseUrl } from '../server/routes.js';

async function main() {
  console.log('[Cosmogeek] Initializing database...');
  await getDatabase();
  const certsResult = await getAllCertificates({ limit: 1000 });
  const baseUrl = getPublicBaseUrl();
  console.log(`[Cosmogeek] Regenerating all certificate PDFs and QR codes with Base URL: ${baseUrl}`);

  let count = 0;
  for (const cert of certsResult.certificates) {
    await generateCertificatePdf(cert, baseUrl);
    console.log(`  ✓ Regenerated QR & PDF for: ${cert.certificateNumber} (${cert.recipientName})`);
    count++;
  }

  console.log(`[Cosmogeek] Successfully regenerated ${count} certificate PDFs and QR codes!`);
}

main().catch((err) => {
  console.error('[Cosmogeek] Error regenerating certificates:', err);
  process.exit(1);
});

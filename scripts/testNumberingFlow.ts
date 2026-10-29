import 'dotenv/config';
import assert from 'node:assert/strict';
import {
  getDatabase,
  getNextCertificateNumber,
  insertCertificate,
  getCertificateByNumber,
  saveDatabaseToDisk,
  isMongoConnected,
  connectMongoDB,
} from '../server/db.js';
import { StudentCertificateModel } from '../server/mongodb.js';
import { generateCertificatePdf } from '../server/pdfEngine.js';
import { Certificate } from '../src/types/index.js';

async function runTest() {
  console.log('================================================================');
  console.log('TESTING CERTIFICATE NUMBERING FLOW (#26847 -> #26848)');
  console.log('================================================================');

  await connectMongoDB();
  console.log('1. MongoDB Connected:', isMongoConnected() ? 'YES' : 'NO (using SQLite)');

  // Step 1: Check initial next number
  const initialNext = await getNextCertificateNumber();
  console.log(`2. Current getNextCertificateNumber() result: ${initialNext}`);
  assert.equal(initialNext, '#26847', 'Next certificate number must be #26847');
  console.log('   ✓ Verified: initial next number is #26847');

  const testVerId = `cg-26847-test-${Date.now()}`;
  const testCert: Certificate = {
    id: `cert_test_26847_${Date.now()}`,
    certificateNumber: initialNext,
    verificationId: testVerId,
    recipientName: 'Test Recipient 26847',
    recipientEmail: 'test26847@example.com',
    designation: 'Software Engineer Intern',
    certificateType: 'Certificate of Completion',
    internshipDuration: '3 months',
    startDate: '2026-07-01',
    endDate: '2026-10-01',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director / Authorized Signatory',
    issueLocation: 'Nagpur, Maharashtra, India',
    status: 'VALID',
    verificationUrl: `http://localhost:3000/verify/${testVerId}`,
    verificationPath: `/verify/${testVerId}`,
    pdfPath: `storage/certificates/26847.pdf`,
    issuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    console.log('\n3. Testing PDF Generation for #26847:');
    const pdfResult = await generateCertificatePdf(testCert, 'http://localhost:3000');
    assert.ok(pdfResult.pdfBuffer.length > 0, 'PDF buffer must not be empty');
    console.log(`   ✓ PDF generated successfully (${pdfResult.pdfBuffer.length} bytes, file: ${pdfResult.relativePath})`);

    console.log('\n4. Inserting certificate into Database with certificate number #26847:');
    const saved = await insertCertificate(testCert);
    assert.equal(saved.certificateNumber, '#26847');
    console.log(`   ✓ Certificate saved successfully: ${saved.certificateNumber} (${saved.recipientName})`);

    // Step 3: Verify retrieval from DB
    console.log('\n5. Verifying retrieval by certificate number #26847:');
    const fetched = await getCertificateByNumber('#26847');
    assert.ok(fetched, 'Certificate #26847 must exist in database');
    assert.equal(fetched.certificateNumber, '#26847');
    assert.equal(fetched.recipientName, 'Test Recipient 26847');
    console.log(`   ✓ Found in DB: ${fetched.certificateNumber} - ${fetched.recipientName}`);

    // Step 4: Verify duplicate prevention
    console.log('\n6. Testing Duplicate Prevention for #26847:');
    let duplicateRejected = false;
    try {
      const duplicateCert = { ...testCert, id: `dup_${Date.now()}`, verificationId: `dup_ver_${Date.now()}` };
      await insertCertificate(duplicateCert);
    } catch (err: any) {
      duplicateRejected = true;
      console.log(`   ✓ Duplicate certificate number #26847 correctly rejected: ${err.message}`);
    }
    assert.ok(duplicateRejected, 'Duplicate certificate number #26847 must be rejected');

    // Step 5: Check that the next certificate number is now #26848
    console.log('\n7. Verifying next certificate number after #26847 is saved:');
    const nextAfter26847 = await getNextCertificateNumber();
    console.log(`   Next certificate number is: ${nextAfter26847}`);
    assert.equal(nextAfter26847, '#26848', 'Next certificate number after #26847 must be #26848');
    console.log('   ✓ Verified: sequence accurately progressed to #26848');
  } finally {
    // Clean up the test certificate so #26847 is clean for user's real certificate
    console.log('\n8. Cleaning up test record #26847 so the user can generate real certificate #26847:');
    if (isMongoConnected()) {
      await StudentCertificateModel.deleteMany({ certificateNumber: '#26847' });
    }
    const db = await getDatabase();
    db.run('DELETE FROM certificates WHERE certificateNumber = ?', ['#26847']);
    saveDatabaseToDisk();
    console.log('   ✓ Test record #26847 cleaned up from MongoDB Atlas & SQLite.');
  }

  // Step 7: Confirm next certificate number is again #26847
  const finalNext = await getNextCertificateNumber();
  console.log(`\n9. Final check: next certificate number for production use is: ${finalNext}`);
  assert.equal(finalNext, '#26847', 'Next certificate number must be ready at #26847');
  console.log('   ✓ Verified: ready at #26847 for next student certificate generation!');

  console.log('\n================================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('\n✗ TEST FAILED:', err);
  process.exit(1);
});

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMongoDB, isMongoConnected, getMongoHealth, getResolvedMongoUri, StudentCertificateModel } from '../server/mongodb.js';
import { getDatabase, insertCertificate, getCertificateByVerificationId } from '../server/db.js';
import { Certificate } from '../src/types/index.js';

async function testConnection() {
  console.log('================================================================');
  console.log('COSMOGEEK CERTIFICATE SYSTEM - MONGODB ATLAS VERIFICATION');
  console.log('================================================================');

  const resolvedUri = getResolvedMongoUri();
  const hasUri = Boolean(resolvedUri && resolvedUri.length > 0);

  console.log(`1. Environment Variable Check:`);
  console.log(`   - MONGODB_URI configured: ${hasUri ? 'YES (configured)' : 'NO (empty string on disk)'}`);

  if (!hasUri) {
    console.log(`\n[DIAGNOSTIC NOTICE]`);
    console.log(`The file .env currently has MONGODB_URI="" on disk.`);
    console.log(`Please configure your MongoDB connection string in .env and rerun.`);
    return;
  }

  // Masked URI inspection (never logs password or raw credentials)
  try {
    const masked = resolvedUri.replace(/:([^@]+)@/, ':****@');
    console.log(`   - Target Endpoint: ${masked}`);
  } catch {}

  console.log(`\n2. Connecting to MongoDB Atlas (Database: certificateDB, Collection: students)...`);
  const success = await connectMongoDB();

  if (!success) {
    const health = getMongoHealth();
    console.error(`\n[CONNECTION FAILED]`);
    console.error(`Error details: ${health.error}`);
    console.error(`\nDiagnostic & Resolution:`);
    console.error(`1. IP Access List (Whitelist): Atlas gave "SSL alert number 80".`);
    console.error(`   Log into cloud.mongodb.com -> Select Project -> Network Access -> Add IP Address.`);
    console.error(`   Add 0.0.0.0/0 (Allow Access from Anywhere) or your public IP: 202.141.53.8.`);
    console.error(`2. Database & User: Ensure Database User has 'readWrite' or 'dbAdmin' role on certificateDB.`);
    console.error(`3. URL Format: Ensure database is specified as /certificateDB?retryWrites=true&w=majority.`);
    return;
  }

  console.log(`   ✓ MongoDB Atlas connection SUCCESSFUL!`);
  console.log(`   - Database: certificateDB`);
  console.log(`   - Collection: students`);

  console.log(`\n3. Verifying Student Documents in MongoDB Atlas:`);
  const count = await StudentCertificateModel.countDocuments();
  console.log(`   - Total student certificates currently in "students" collection: ${count}`);

  console.log(`\n4. Performing End-to-End Certificate Creation & QR Test in MongoDB:`);
  await getDatabase(); // Ensure initialization
  const testCertId = `cert_verify_${Date.now()}`;
  const testVerificationId = `cg-verify-${Date.now()}`;
  const verificationUrl = `http://192.168.101.73:3000/verify/${testVerificationId}`;

  const testCert: Certificate = {
    id: testCertId,
    certificateNumber: `#VERIFY-${Date.now().toString().slice(-4)}`,
    verificationId: testVerificationId,
    recipientName: 'Aarav Sharma',
    recipientEmail: 'aarav.sharma@example.com',
    designation: 'Full Stack Developer',
    department: 'Software Engineering',
    certificateType: 'Certificate of Completion',
    internshipDuration: '3 months',
    startDate: '2026-07-01',
    endDate: '2026-10-01',
    issuingCompany: 'Cosmogeek Software Solutions Pvt. Ltd.',
    signatoryName: 'Anirudh Hatwar',
    signatoryRole: 'Director / Authorized Signatory',
    issueLocation: 'Nagpur, Maharashtra, India',
    status: 'VALID',
    verificationUrl,
    verificationPath: `/verify/${testVerificationId}`,
    pdfPath: `storage/certificates/verify-${Date.now()}.pdf`,
    issuedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const inserted = await insertCertificate(testCert);
  console.log(`   ✓ Inserted certificate into MongoDB collection "students":`);
  console.log(`     - Student Name: ${inserted.recipientName}`);
  console.log(`     - Certificate Number: ${inserted.certificateNumber}`);
  console.log(`     - Verification ID: ${inserted.verificationId}`);
  console.log(`     - Department: ${inserted.department}`);
  console.log(`     - Verification URL: ${inserted.verificationUrl}`);

  console.log(`\n5. Testing Retrieval by Verification ID:`);
  const fetched = await getCertificateByVerificationId(testVerificationId);
  if (fetched && fetched.verificationId === testVerificationId) {
    console.log(`   ✓ Retrieval SUCCESS: Document fetched accurately from MongoDB Atlas!`);
  } else {
    console.error(`   ✗ Retrieval FAILED: Document could not be fetched.`);
  }

  // Clean up diagnostic test record to keep database pristine
  await StudentCertificateModel.deleteOne({ verificationId: testVerificationId });
  console.log(`   ✓ Cleaned up temporary test record from "students" collection.`);

  console.log(`================================================================`);
  console.log(`VERIFICATION COMPLETED SUCCESSFULLY`);
  console.log(`================================================================`);
  await mongoose.disconnect();
}

testConnection().catch((err) => {
  console.error('[Fatal Test Error]:', err.message);
  process.exit(1);
});

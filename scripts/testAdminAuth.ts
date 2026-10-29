import 'dotenv/config';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import {
  getDatabase,
  getAdminByUsername,
  getAdminById,
  isMongoConnected,
  connectMongoDB,
} from '../server/db.js';
import { AdminModel } from '../server/mongodb.js';

async function testAuth() {
  console.log('================================================================');
  console.log('TESTING ADMIN AUTHENTICATION (Anirudh Hatwar)');
  console.log('================================================================');

  await connectMongoDB();
  console.log('1. MongoDB Connected:', isMongoConnected() ? 'YES' : 'NO');

  console.log('\n2. Initializing database and syncing default admin...');
  await getDatabase();

  console.log('\n3. Inspecting MongoDB Admin records:');
  if (isMongoConnected()) {
    const mongoAdmins = await AdminModel.find({}).lean();
    console.log('   Records in MongoDB "admins":', mongoAdmins.map(a => ({ id: a.id, username: a.username })));
    assert.ok(mongoAdmins.length >= 1, 'MongoDB must have at least 1 admin record');
    const matched = mongoAdmins.find(a => a.username === 'Anirudh Hatwar');
    assert.ok(matched, 'Admin Anirudh Hatwar must be present in MongoDB');
    console.log('   ✓ Verified: "Anirudh Hatwar" is present in MongoDB Atlas with id:', matched.id);
  }

  console.log('\n4. Testing getAdminByUsername("Anirudh Hatwar"):');
  const adminExact = await getAdminByUsername('Anirudh Hatwar');
  assert.ok(adminExact, 'Admin must be found by exact username');
  assert.equal(adminExact.username, 'Anirudh Hatwar');
  console.log('   ✓ Found admin:', adminExact.username, '(id:', adminExact.id, ')');

  console.log('\n5. Testing case-insensitivity getAdminByUsername("anirudh hatwar"):');
  const adminLower = await getAdminByUsername('anirudh hatwar');
  assert.ok(adminLower, 'Admin must be found by lowercase username');
  assert.equal(adminLower.username, 'Anirudh Hatwar');
  console.log('   ✓ Case-insensitive lookup verified successfully!');

  console.log('\n6. Testing getAdminByUsername("  Anirudh Hatwar  ") with whitespace:');
  const adminSpaces = await getAdminByUsername('  Anirudh Hatwar  ');
  assert.ok(adminSpaces, 'Admin must be found when leading/trailing spaces are present');
  console.log('   ✓ Whitespace-trimmed lookup verified successfully!');

  console.log('\n7. Testing password verification:');
  const targetPassword = process.env.ADMIN_DEFAULT_PASSWORD || '';
  if (targetPassword) {
    const matchesNew = bcrypt.compareSync(targetPassword, adminExact.passwordHash);
    assert.equal(matchesNew, true, 'Configured admin password must match bcrypt passwordHash');
    console.log('   ✓ Configured password matches bcrypt hash: YES');
  }

  const matchesOld = bcrypt.compareSync('Admin@Cosmogeek2026!', adminExact.passwordHash);
  assert.equal(matchesOld, false, 'Old default password must NOT match');
  console.log('   ✓ Old password "Admin@Cosmogeek2026!" rejected: YES');

  const matchesWrong = bcrypt.compareSync('WrongPassword123', adminExact.passwordHash);
  assert.equal(matchesWrong, false, 'Arbitrary wrong password must NOT match');
  console.log('   ✓ Arbitrary wrong password rejected: YES');

  console.log('\n8. Testing getAdminById:');
  const byId = await getAdminById(adminExact.id);
  assert.ok(byId, 'Admin must be retrievable by id');
  assert.equal(byId.username, 'Anirudh Hatwar');
  console.log('   ✓ Found by ID:', byId.username);

  console.log('\n================================================================');
  console.log('ALL ADMIN AUTHENTICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
  process.exit(0);
}

testAuth().catch(err => {
  console.error('\n✗ TEST FAILED:', err);
  process.exit(1);
});

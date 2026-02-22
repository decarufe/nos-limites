const db = require('better-sqlite3')('./server/data/noslimites.db');

console.log('=== Checking Users ===');
const users = db.prepare('SELECT id, email, displayName FROM users').all();
console.log(`Found ${users.length} users:`);
users.forEach(u => console.log(`  - ${u.email} (${u.displayName})`));

console.log('\n=== Checking Relationships ===');
const relationships = db.prepare('SELECT * FROM relationships').all();
console.log(`Found ${relationships.length} relationships:`);
relationships.forEach(r => {
  console.log(`  - ID: ${r.id}`);
  console.log(`    Inviter: ${r.inviter_id}`);
  console.log(`    Invitee: ${r.invitee_id || 'pending'}`);
  console.log(`    Status: ${r.status}`);
});

db.close();

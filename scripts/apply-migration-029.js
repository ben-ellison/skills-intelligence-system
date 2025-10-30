const { Client } = require('pg');
const fs = require('fs');

const connectionString = 'postgresql://postgres.ytknzkfdyvuwazoigisd:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function applyMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    const migration = fs.readFileSync('./supabase/migrations/029_fix_duplicate_tabs.sql', 'utf8');
    
    console.log('Applying migration 029: Fix duplicate tabs...');
    await client.query(migration);
    
    console.log('✓ Migration 029 applied successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

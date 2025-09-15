const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Extract connection details from the service role key
const supabaseUrl = 'https://pzmrvovqxbmobunludna.supabase.co';
const projectRef = 'pzmrvovqxbmobunludna';

// PostgreSQL connection string for Supabase
const connectionString = `postgresql://postgres:[YOUR_DB_PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;

/**
 * Apply a SQL migration file to the provided PostgreSQL client.
 *
 * Reads the SQL file located under `supabase/migrations/<migrationFile>`, executes its
 * contents via `client.query(...)`, and returns whether the execution succeeded.
 * The function logs a short preview of the migration and success/failure messages.
 *
 * @param {string} migrationFile - Filename of the migration located in `supabase/migrations`.
 * @returns {Promise<boolean>} Resolves to `true` if the migration was applied successfully, otherwise `false`.
 */
async function applyMigration(client, migrationFile) {
  try {
    console.log(`\nApplying migration: ${migrationFile}`);
    const migrationPath = path.join('supabase/migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Migration content preview: ${migrationSQL.substring(0, 200)}...`);
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log(`✅ Successfully applied: ${migrationFile}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to apply ${migrationFile}:`, err.message);
    return false;
  }
}

/**
 * Print a dry-run of SQL migrations that would be applied and show steps to actually run them.
 *
 * This async function lists the migration files that the script is prepared to apply, warns that
 * the PostgreSQL password must be supplied in the connection string, and prints instructions
 * for enabling the commented database-connection block to perform the migrations. It does not
 * connect to the database or execute any SQL as the connection & execution logic is intentionally
 * left commented out.
 *
 * @returns {Promise<void>}
 */
async function main() {
  console.log('Note: This script requires your database password.');
  console.log('You can find it in your Supabase dashboard under Settings > Database.');
  console.log('Please update the connectionString in this script with your actual password.\n');
  
  // For now, let's just show what would be applied
  const migrationsToApply = [
    '036_rebuild_swap_system.sql'
  ];

  console.log('Migrations that would be applied:');
  migrationsToApply.forEach((migration, index) => {
    console.log(`${index + 1}. ${migration}`);
  });
  
  console.log('\nTo actually apply these migrations:');
  console.log('1. Update the connectionString with your database password');
  console.log('2. Uncomment the client connection code below');
  console.log('3. Run this script again');
  
  /*
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase database');
    
    for (const migration of migrationsToApply) {
      const success = await applyMigration(client, migration);
      if (!success) {
        console.log('Migration failed, stopping...');
        break;
      }
      // Wait a bit between migrations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Migration application complete!');
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
  */
}

main().catch(console.error);

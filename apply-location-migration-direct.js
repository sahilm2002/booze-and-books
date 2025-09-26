#!/usr/bin/env node

/**
 * Apply the location to city/state migration directly to Supabase
 * This bypasses the CLI migration system and applies the SQL directly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the migration file
const migrationPath = path.join(__dirname, 'supabase/migrations/062_replace_location_with_city_state.sql');

if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Applying location migration directly to database...\n');

// Create a temporary SQL file for direct execution
const tempSqlFile = 'temp_location_migration.sql';
fs.writeFileSync(tempSqlFile, migrationSQL);

console.log('📋 Migration SQL saved to temporary file:', tempSqlFile);
console.log('\n🔧 Executing migration...');

// Use psql to execute the migration directly
import { execSync } from 'child_process';

try {
    // Get the database URL from supabase status
    const statusOutput = execSync('supabase status', { encoding: 'utf8' });
    const dbUrlMatch = statusOutput.match(/DB URL\s+│\s+(.+)/);
    
    if (!dbUrlMatch) {
        console.error('❌ Could not find database URL from supabase status');
        console.log('\n📝 Manual application required:');
        console.log('1. Copy the SQL from the migration file');
        console.log('2. Run it in your Supabase SQL editor');
        console.log('3. Or use: psql "YOUR_DB_URL" -f', tempSqlFile);
        process.exit(1);
    }
    
    const dbUrl = dbUrlMatch[1];
    console.log('🔗 Found database URL');
    
    // Execute the migration
    execSync(`psql "${dbUrl}" -f ${tempSqlFile}`, { stdio: 'inherit' });
    
    console.log('\n✅ Migration applied successfully!');
    console.log('🎉 Location field has been replaced with city and state fields');
    
} catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.log('\n📝 Manual application required:');
    console.log('1. Copy the SQL from', tempSqlFile);
    console.log('2. Run it in your Supabase SQL editor');
} finally {
    // Clean up temporary file
    if (fs.existsSync(tempSqlFile)) {
        fs.unlinkSync(tempSqlFile);
        console.log('🧹 Cleaned up temporary file');
    }
}

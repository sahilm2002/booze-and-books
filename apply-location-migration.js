#!/usr/bin/env node

/**
 * Apply the location to city/state migration
 * This script applies migration 062_replace_location_with_city_state.sql
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

console.log('📋 Migration SQL to apply:');
console.log('=' .repeat(50));
console.log(migrationSQL);
console.log('=' .repeat(50));

console.log('\n🔧 This migration will:');
console.log('1. Add city and state columns to profiles table (if they don\'t exist)');
console.log('2. Parse existing location data into city and state fields');
console.log('3. Remove the location column');
console.log('4. Handle various location formats like "City, State", "City, ST", etc.');

console.log('\n📝 To apply this migration:');
console.log('1. Copy the SQL above');
console.log('2. Run it in your Supabase SQL editor');
console.log('3. Or use the Supabase CLI: supabase db push');

console.log('\n✅ After applying, the profile system will use separate city and state fields instead of a single location field.');

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration(migrationFile) {
    console.log(`\nApplying migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
        console.error(`Migration file not found: ${migrationPath}`);
        return false;
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
            console.error(`Error applying ${migrationFile}:`, error);
            return false;
        }
        
        console.log(`✅ Successfully applied: ${migrationFile}`);
        return true;
    } catch (err) {
        console.error(`Exception applying ${migrationFile}:`, err);
        return false;
    }
}

async function main() {
    console.log('Applying new chat migrations...');
    
    // Apply migrations in order
    const migrations = [
        '051_extend_notifications_for_chat.sql',
        '052_remove_duplicate_notifications.sql'
    ];
    
    for (const migration of migrations) {
        const success = await applyMigration(migration);
        if (!success) {
            console.error(`Failed to apply ${migration}. Stopping.`);
            process.exit(1);
        }
    }
    
    console.log('\n🎉 All new migrations applied successfully!');
}

main().catch(console.error);

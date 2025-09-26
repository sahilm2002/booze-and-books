import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Applying profile RLS fix...');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

try {
  // Read the SQL file
  const sql = readFileSync('fix-profile-rls.sql', 'utf8');
  
  console.log('Executing RLS policy fix...');
  
  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Failed to apply RLS fix:', error.message);
    
    // Try executing each statement individually
    console.log('Trying individual statements...');
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement.trim() });
        if (stmtError) {
          console.error(`❌ Statement failed: ${stmtError.message}`);
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
  } else {
    console.log('✅ RLS policy fix applied successfully');
  }
  
} catch (err) {
  console.error('❌ Error applying RLS fix:', err.message);
  
  // Fallback: try using raw SQL execution
  console.log('Trying direct SQL execution...');
  
  try {
    const sql = readFileSync('fix-profile-rls.sql', 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
        try {
          const { error } = await supabase.from('_').select('1').limit(0); // This won't work but will test connection
          // Since we can't execute raw SQL directly, let's use the REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ sql_query: statement.trim() })
          });
          
          if (response.ok) {
            console.log('✅ Statement executed successfully');
          } else {
            const errorText = await response.text();
            console.error(`❌ Statement failed: ${errorText}`);
          }
        } catch (stmtErr) {
          console.error(`❌ Statement error: ${stmtErr.message}`);
        }
      }
    }
  } catch (fallbackErr) {
    console.error('❌ Fallback execution failed:', fallbackErr.message);
  }
}

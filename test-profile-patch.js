import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing profile PATCH request...');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test the exact same PATCH request that's failing in the browser
try {
  console.log('\n1. Testing profile PATCH with service key...');
  
  const profileId = '793734b0-6131-4b9c-919f-f0bba8c9f1b9'; // From the error
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      full_name: 'Test Name Update',
      city: 'Test City',
      state: 'CA'
    })
    .eq('id', profileId)
    .select();
    
  if (error) {
    console.error('❌ Profile PATCH failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
  } else {
    console.log('✅ Profile PATCH successful with service key');
    console.log('Updated data:', data);
  }
} catch (err) {
  console.error('❌ Profile PATCH error:', err.message);
}

// Test with anon key (like the browser uses)
try {
  console.log('\n2. Testing profile PATCH with anon key...');
  
  const anonSupabase = createClient(supabaseUrl, process.env.PUBLIC_SUPABASE_ANON_KEY);
  const profileId = '793734b0-6131-4b9c-919f-f0bba8c9f1b9';
  
  const { data, error } = await anonSupabase
    .from('profiles')
    .update({ 
      full_name: 'Test Name Update',
      city: 'Test City',
      state: 'CA'
    })
    .eq('id', profileId)
    .select();
    
  if (error) {
    console.error('❌ Profile PATCH failed with anon key:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
  } else {
    console.log('✅ Profile PATCH successful with anon key');
    console.log('Updated data:', data);
  }
} catch (err) {
  console.error('❌ Profile PATCH error with anon key:', err.message);
}

// Test RLS policies
try {
  console.log('\n3. Checking RLS policies on profiles table...');
  
  const { data: policies, error: policyError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'profiles');
    
  if (policyError) {
    console.error('❌ Could not fetch RLS policies:', policyError.message);
  } else {
    console.log('✅ RLS policies found:');
    policies.forEach(policy => {
      console.log(`- ${policy.policyname}: ${policy.cmd} for ${policy.roles}`);
    });
  }
} catch (err) {
  console.error('❌ RLS policy check error:', err.message);
}

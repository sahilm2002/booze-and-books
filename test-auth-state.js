import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing authentication state...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test authentication flow
try {
  console.log('\n1. Testing user authentication...');
  
  // Try to get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error('❌ Failed to get user:', userError.message);
  } else if (!user) {
    console.log('❌ No authenticated user found');
    
    // Try to sign in with email/password (you'll need to provide credentials)
    console.log('Attempting to sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'sahil.mbh1b@gmail.com', // Replace with actual email
      password: 'your-password' // Replace with actual password
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError.message);
    } else {
      console.log('✅ Sign in successful');
      console.log('User ID:', signInData.user?.id);
    }
  } else {
    console.log('✅ User authenticated');
    console.log('User ID:', user.id);
    console.log('User email:', user.email);
  }
  
} catch (err) {
  console.error('❌ Authentication test error:', err.message);
}

// Test profile update with authenticated user
try {
  console.log('\n2. Testing profile update with authenticated user...');
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        full_name: 'Test Update ' + new Date().toISOString(),
        city: 'Test City',
        state: 'CA'
      })
      .eq('id', user.id)
      .select();
      
    if (error) {
      console.error('❌ Profile update failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
    } else {
      console.log('✅ Profile update successful');
      console.log('Updated data:', data);
    }
  } else {
    console.log('❌ Cannot test profile update - no authenticated user');
  }
  
} catch (err) {
  console.error('❌ Profile update test error:', err.message);
}

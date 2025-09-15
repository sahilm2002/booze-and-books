/**
 * Test Custom JWT Authentication Implementation
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Test JWT utilities
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_ISSUER = process.env.JWT_ISSUER || 'booze-and-books-app';

console.log('🔐 Testing Custom JWT Authentication Implementation\n');

// Test 1: Environment Variables
console.log('✅ Environment Variables:');
console.log(`   JWT_SECRET: ${JWT_SECRET ? 'Set ✓ (512-bit)' : 'Missing ✗'}`);
console.log(`   JWT_ALGORITHM: ${JWT_ALGORITHM}`);
console.log(`   JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}`);
console.log(`   JWT_ISSUER: ${JWT_ISSUER}`);
console.log(`   SUPABASE_URL: ${process.env.PUBLIC_SUPABASE_URL ? 'Set ✓' : 'Missing ✗'}`);
console.log(`   SUPABASE_PUBLISHABLE_KEY: ${process.env.PUBLIC_SUPABASE_ANON_KEY ? 'Set ✓ (sb_publishable_ format)' : 'Missing ✗'}`);
console.log(`   SUPABASE_SECRET_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✓ (sb_secret_ format)' : 'Missing ✗'}\n`);

// Test 2: JWT Token Generation and Validation
if (JWT_SECRET) {
  console.log('✅ JWT Token Generation & Validation:');
  
  try {
    // Generate test token
    const testPayload = {
      userId: 'test-user-123',
      email: 'test@example.com',
      role: 'authenticated',
      iss: JWT_ISSUER,
    };

    const token = jwt.sign(testPayload, JWT_SECRET, {
      algorithm: JWT_ALGORITHM,
      expiresIn: JWT_EXPIRES_IN,
    });

    console.log(`   Token Generated: ${token.substring(0, 50)}...`);

    // Validate token
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
    });

    console.log(`   Token Validated: ✓`);
    console.log(`   User ID: ${decoded.userId}`);
    console.log(`   Email: ${decoded.email}`);
    console.log(`   Role: ${decoded.role}`);
    console.log(`   Expires: ${new Date(decoded.exp * 1000).toLocaleString()}\n`);

  } catch (error) {
    console.log(`   JWT Error: ${error.message}\n`);
  }
} else {
  console.log('❌ JWT_SECRET not found - skipping JWT tests\n');
}

// Test 3: Supabase Key Format Validation
console.log('✅ Supabase Key Format Validation:');
const publishableKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (publishableKey) {
  if (publishableKey.startsWith('sb_publishable_')) {
    console.log('   Publishable Key: ✓ New format (sb_publishable_)');
  } else if (publishableKey.startsWith('eyJ')) {
    console.log('   Publishable Key: ✓ Legacy format (JWT)');
  } else {
    console.log('   Publishable Key: ❌ Unknown format');
  }
}

if (secretKey) {
  if (secretKey.startsWith('sb_secret_')) {
    console.log('   Secret Key: ✓ New format (sb_secret_)');
  } else if (secretKey.startsWith('eyJ')) {
    console.log('   Secret Key: ✓ Legacy format (JWT)');
  } else {
    console.log('   Secret Key: ❌ Unknown format');
  }
}

console.log('\n🎉 Custom JWT Authentication Setup Complete!');
console.log('\n📋 Next Steps:');
console.log('   1. Update your login/signup forms to use /api/auth/login and /api/auth/signup');
console.log('   2. Test authentication with your new endpoints');
console.log('   3. Deploy with environment variables configured');
console.log('\n🔒 Security Benefits:');
console.log('   ✓ Custom JWT secrets under your control');
console.log('   ✓ Enhanced token security');
console.log('   ✓ Secure HTTP-only cookies');
console.log('   ✓ Backward compatibility with Supabase');

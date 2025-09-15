# 🚀 Production Deployment Guide - Custom JWT Authentication

## Overview

This guide walks you through deploying your Booze & Books application with **Custom JWT Authentication** to production. Your app now uses enterprise-grade security with custom JWT tokens.

## 📋 Pre-Deployment Checklist

### ✅ **Environment Variables Required**

Your production environment **MUST** have these variables configured:

```env
# Custom JWT Configuration (CRITICAL - Keep Secret!)
JWT_SECRET=your-512-bit-custom-jwt-secret-here
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=24h
JWT_ISSUER=booze-and-books-app

# Supabase Configuration
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_your-key-here
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your-key-here

# Optional: Daily Reminder System
DAILY_REMINDER_TOKEN=your-secret-token-here
```

### ⚠️ **Critical Security Notes**

1. **JWT_SECRET** - This is your most critical secret. Never expose it publicly.
2. **SUPABASE_SERVICE_ROLE_KEY** - Keep this secret, it has admin privileges.
3. **Environment Variables** - Never commit these to version control.

## 🌐 Platform-Specific Deployment

### **Option 1: Vercel (Recommended)**

#### **Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

#### **Step 2: Login to Vercel**
```bash
vercel login
```

#### **Step 3: Set Environment Variables**
```bash
# Navigate to your project
cd /Users/smb/Desktop/Personal/booze-and-books

# Set each environment variable
vercel env add JWT_SECRET
# Paste your JWT secret when prompted

vercel env add JWT_ALGORITHM
# Enter: HS256

vercel env add JWT_EXPIRES_IN
# Enter: 24h

vercel env add JWT_ISSUER
# Enter: booze-and-books-app

vercel env add PUBLIC_SUPABASE_URL
# Enter your Supabase URL

vercel env add PUBLIC_SUPABASE_ANON_KEY
# Enter your publishable key

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Enter your secret key

vercel env add DAILY_REMINDER_TOKEN
# Enter your daily reminder token
```

#### **Step 4: Deploy**
```bash
vercel --prod
```

#### **Alternative: Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Go to **Settings > Environment Variables**
4. Add all required variables listed above
5. Deploy

### **Option 2: Netlify**

#### **Step 1: Install Netlify CLI**
```bash
npm install -g netlify-cli
```

#### **Step 2: Login and Deploy**
```bash
# Navigate to your project
cd /Users/smb/Desktop/Personal/booze-and-books

# Login
netlify login

# Build the project
npm run build

# Deploy
netlify deploy --prod --dir=build
```

#### **Step 3: Set Environment Variables**
```bash
# Set each environment variable
netlify env:set JWT_SECRET "your-jwt-secret-here"
netlify env:set JWT_ALGORITHM "HS256"
netlify env:set JWT_EXPIRES_IN "24h"
netlify env:set JWT_ISSUER "booze-and-books-app"
netlify env:set PUBLIC_SUPABASE_URL "your-supabase-url"
netlify env:set PUBLIC_SUPABASE_ANON_KEY "your-publishable-key"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-secret-key"
netlify env:set DAILY_REMINDER_TOKEN "your-daily-reminder-token"
```

### **Option 3: Railway**

#### **Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
```

#### **Step 2: Deploy**
```bash
# Navigate to your project
cd /Users/smb/Desktop/Personal/booze-and-books

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set JWT_SECRET=your-jwt-secret-here
railway variables set JWT_ALGORITHM=HS256
railway variables set JWT_EXPIRES_IN=24h
railway variables set JWT_ISSUER=booze-and-books-app
railway variables set PUBLIC_SUPABASE_URL=your-supabase-url
railway variables set PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-secret-key
railway variables set DAILY_REMINDER_TOKEN=your-daily-reminder-token

# Deploy
railway up
```

### **Option 4: DigitalOcean App Platform**

#### **Step 1: Create App**
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Create new app from GitHub repository
3. Configure build settings:
   - **Build Command**: `npm run build`
   - **Run Command**: `node build`

#### **Step 2: Set Environment Variables**
In the DigitalOcean dashboard:
1. Go to your app settings
2. Navigate to **Environment Variables**
3. Add all required variables

## 🔧 Build Configuration

### **Ensure Your Build Works Locally**
```bash
# Navigate to your project
cd /Users/smb/Desktop/Personal/booze-and-books

# Install dependencies
npm install

# Build for production
npm run build

# Preview the build
npm run preview
```

### **SvelteKit Adapter Configuration**

Ensure your `svelte.config.js` has the correct adapter:

```javascript
// For Vercel
import adapter from '@sveltejs/adapter-vercel';

// For Netlify
import adapter from '@sveltejs/adapter-netlify';

// For Node.js (Railway, DigitalOcean)
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter()
  }
};
```

## 🔒 Security Verification

### **After Deployment, Verify:**

1. **Environment Variables Loaded**
   - Check your hosting platform's logs
   - Ensure no "JWT_SECRET environment variable is required" errors

2. **HTTPS Enabled**
   - Your site should use HTTPS (required for secure cookies)
   - Most platforms enable this automatically

3. **Cookie Security**
   - Open browser dev tools
   - Check that authentication cookies are:
     - `HttpOnly: true`
     - `Secure: true`
     - `SameSite: strict`

4. **Authentication Flow**
   - Test signup, login, and logout
   - Verify redirects work correctly
   - Check that tokens are not exposed in client-side storage

## 🚨 Troubleshooting

### **Common Issues:**

#### **"JWT_SECRET environment variable is required"**
- **Solution**: Ensure JWT_SECRET is set in your hosting platform
- **Check**: Platform-specific environment variable settings

#### **"Cannot find module '$lib/auth/customAuth'"**
- **Solution**: Rebuild your application
- **Command**: `npm run build`

#### **Authentication not working**
- **Check**: All environment variables are set correctly
- **Verify**: HTTPS is enabled on your domain
- **Test**: Cookie settings in browser dev tools

#### **Supabase connection issues**
- **Verify**: PUBLIC_SUPABASE_URL is correct
- **Check**: Both publishable and secret keys are valid
- **Test**: Keys work with your Supabase project

## 📊 Monitoring & Maintenance

### **Post-Deployment Monitoring:**

1. **Check Application Logs**
   - Monitor for authentication errors
   - Watch for JWT validation failures

2. **Monitor Performance**
   - Custom JWT validation adds minimal overhead
   - Should see no significant performance impact

3. **Security Monitoring**
   - Watch for unusual authentication patterns
   - Monitor failed login attempts

### **Regular Maintenance:**

1. **Rotate JWT Secret** (Recommended: Every 6 months)
   ```bash
   # Generate new secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Update in production environment
   # This will invalidate all existing sessions
   ```

2. **Update Supabase Keys** (As needed)
   - Rotate in Supabase dashboard
   - Update in production environment

3. **Monitor Dependencies**
   ```bash
   npm audit
   npm update
   ```

## ✅ **Deployment Success Checklist**

- [ ] All environment variables configured
- [ ] Application builds successfully
- [ ] HTTPS enabled
- [ ] Authentication flow works (signup/login/logout)
- [ ] Secure cookies are set correctly
- [ ] No JWT tokens in client-side storage
- [ ] Error monitoring configured
- [ ] Performance monitoring active

## 🎉 **You're Ready for Production!**

Your Booze & Books application now has:
- ✅ **Enterprise-grade JWT security

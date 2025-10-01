# 🚀 Quick Deployment Checklist - Booze & Books

## 📋 Your Environment Variables

Copy these to your production hosting platform:

```env
# Custom JWT Configuration (CRITICAL - Keep Secret!)
JWT_SECRET=[Use the value from your .env file - 512-bit secret]
JWT_ALGORITHM=HS256
JWT_EXPIRES_IN=24h
JWT_ISSUER=booze-and-books-app

# Supabase Configuration (NEW API KEY FORMAT)
PUBLIC_SUPABASE_URL=[Your Supabase project URL from .env]
PUBLIC_SUPABASE_ANON_KEY=[Your sb_publishable_ key from .env]
SUPABASE_SERVICE_ROLE_KEY=[Your sb_secret_ key from .env]

# Google Maps/Places API Keys (Required; app fails fast on startup if missing)
GOOGLE_PLACES_API_KEY=[Your Google Places API key]
GOOGLE_GEOCODING_API_KEY=[Your Google Geocoding API key]

# Optional
DAILY_REMINDER_TOKEN=[Use value from your .env file]
```

## ⚡ Quick Deploy Commands

### **Vercel (Recommended)**
```bash
# Install CLI
npm install -g vercel

# Login
vercel login

# Navigate to project
cd /Users/smb/Desktop/Personal/booze-and-books

# Set environment variables (you'll be prompted for values)
vercel env add JWT_SECRET
vercel env add JWT_ALGORITHM
vercel env add JWT_EXPIRES_IN
vercel env add JWT_ISSUER
vercel env add PUBLIC_SUPABASE_URL
vercel env add PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GOOGLE_PLACES_API_KEY
vercel env add GOOGLE_GEOCODING_API_KEY
vercel env add DAILY_REMINDER_TOKEN

# Deploy
vercel --prod
```

### **Railway**
```bash
# Install CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Set all variables at once (replace with your actual values from .env)
railway variables set JWT_SECRET="your-jwt-secret-from-env"
railway variables set JWT_ALGORITHM="HS256"
railway variables set JWT_EXPIRES_IN="24h"
railway variables set JWT_ISSUER="booze-and-books-app"
railway variables set PUBLIC_SUPABASE_URL="your-supabase-url-from-env"
railway variables set PUBLIC_SUPABASE_ANON_KEY="your-publishable-key-from-env"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-secret-key-from-env"
railway variables set GOOGLE_PLACES_API_KEY="your-google-places-api-key"
railway variables set GOOGLE_GEOCODING_API_KEY="your-google-geocoding-api-key"
railway variables set DAILY_REMINDER_TOKEN="your-daily-reminder-token-from-env"

# Deploy
railway up
```

## ✅ Pre-Deploy Test

Run this locally to ensure everything works:

```bash
cd /Users/smb/Desktop/Personal/booze-and-books

# Test JWT system
node test-custom-auth.js

# Build for production
npm run build

# Preview build
npm run preview
```

## 🔒 Security Verification After Deploy

1. **Visit your deployed site**
2. **Test signup/login flow**
3. **Check browser dev tools:**
   - No JWT tokens in localStorage/sessionStorage ✅
   - Secure HTTP-only cookie set after login ✅
   - Cookie cleared after logout ✅

## 🚨 Important Notes

- **Never commit your .env file** - it contains secrets
- **JWT_SECRET is critical** - keep it secure
- **HTTPS is required** - most platforms enable automatically
- Google API keys are required for store locator features — the app fails fast on startup if either GOOGLE_PLACES_API_KEY or GOOGLE_GEOCODING_API_KEY is missing.
- **Test thoroughly** before going live

## 📞 Need Help?

- Check `PRODUCTION_DEPLOYMENT_GUIDE.md` for detailed instructions
- Review `CUSTOM_JWT_AUTHENTICATION.md` for technical details
- Monitor your hosting platform's logs for any errors

---

**🎉 Your custom JWT authentication system is ready for production!**

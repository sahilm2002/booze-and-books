# 🚀 Vercel Web Deployment Guide - Booze & Books

## Step-by-Step Deployment via Vercel.com Website

### **Prerequisites**
- Your code pushed to GitHub repository
- Your `.env` file with all the required values (locally only - never commit this!)

---

## **Step 1: Access Vercel Dashboard**

1. Go to **[vercel.com](https://vercel.com)**
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended)
4. Authorize Vercel to access your GitHub repositories

---

## **Step 2: Import Your Project**

1. On the Vercel dashboard, click **"Add New..."**
2. Select **"Project"**
3. Find your **"booze-and-books"** repository in the list
4. Click **"Import"** next to it

---

## **Step 3: Configure Project Settings**

### **Framework Preset:**
- Vercel should auto-detect **"SvelteKit"** ✅
- If not, select **"SvelteKit"** from the dropdown

### **Root Directory:**
- Leave as **"./"** (root) ✅

### **Build Settings:**
- **Build Command**: `npm run build` (auto-filled) ✅
- **Output Directory**: `.svelte-kit` (auto-filled) ✅
- **Install Command**: `npm install` (auto-filled) ✅

---

## **Step 4: Add Environment Variables (CRITICAL)**

**Before deploying**, click **"Environment Variables"** section:

### **Add Each Variable:**

#### **1. JWT_SECRET**
- **Name**: `JWT_SECRET`
- **Value**: `[Copy from your .env file - the long 512-bit string]`
- **Environment**: Select **"Production"**, **"Preview"**, and **"Development"**
- Click **"Add"**

#### **2. JWT_ALGORITHM**
- **Name**: `JWT_ALGORITHM`
- **Value**: `HS256`
- **Environment**: All environments
- Click **"Add"**

#### **3. JWT_EXPIRES_IN**
- **Name**: `JWT_EXPIRES_IN`
- **Value**: `24h`
- **Environment**: All environments
- Click **"Add"**

#### **4. JWT_ISSUER**
- **Name**: `JWT_ISSUER`
- **Value**: `booze-and-books-app`
- **Environment**: All environments
- Click **"Add"**

#### **5. PUBLIC_SUPABASE_URL**
- **Name**: `PUBLIC_SUPABASE_URL`
- **Value**: `[Copy from your .env file - your Supabase project URL]`
- **Environment**: All environments
- Click **"Add"**

#### **6. PUBLIC_SUPABASE_ANON_KEY**
- **Name**: `PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `[Copy from your .env file - your sb_publishable_ key]`
- **Environment**: All environments
- Click **"Add"**

#### **7. SUPABASE_SERVICE_ROLE_KEY**
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `[Copy from your .env file - your sb_secret_ key]`
- **Environment**: All environments
- Click **"Add"**

#### **8. DAILY_REMINDER_TOKEN** (Optional)
- **Name**: `DAILY_REMINDER_TOKEN`
- **Value**: `[Copy from your .env file if you have this]`
- **Environment**: All environments
- Click **"Add"**

---

## **Step 5: Deploy**

1. After adding all environment variables, click **"Deploy"**
2. Vercel will:
   - Clone your repository
   - Install dependencies
   - Build your application
   - Deploy to production

### **Deployment Process:**
```
⏳ Cloning repository...
⏳ Installing dependencies...
⏳ Building application...
⏳ Deploying...
✅ Deployment successful!
```

---

## **Step 6: Verify Deployment**

### **Check Your Live Site:**
1. Vercel will provide a URL like: `https://booze-and-books-xyz.vercel.app`
2. Click the URL to visit your live site
3. Test the authentication flow:
   - Try signing up with a new account
   - Try logging in
   - Try logging out

### **Verify Security:**
1. Open browser **Developer Tools** (F12)
2. Go to **Application** → **Cookies**
3. After logging in, you should see:
   - ✅ `custom-auth-token` cookie (HttpOnly, Secure)
   - ❌ No JWT tokens in localStorage/sessionStorage

---

## **Step 7: Custom Domain (Optional)**

### **Add Your Own Domain:**
1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Follow DNS configuration instructions
5. Vercel will automatically provision SSL certificate

---

## **Step 8: Monitor and Maintain**

### **View Logs:**
1. Go to **"Functions"** tab in your project
2. Click on any function to see logs
3. Monitor for any authentication errors

### **Update Environment Variables:**
1. Go to **"Settings"** → **"Environment Variables"**
2. Edit any variable as needed
3. **Important**: After changing variables, redeploy:
   - Go to **"Deployments"** tab
   - Click **"..."** on latest deployment
   - Select **"Redeploy"**

---

## **🚨 Troubleshooting**

### **Build Fails:**
- Check **"Functions"** tab for error logs
- Ensure all environment variables are set
- Verify your code builds locally: `npm run build`

### **Authentication Not Working:**
- Verify all 8 environment variables are set correctly
- Check that JWT_SECRET is the full 512-bit string
- Ensure Supabase keys are in the new format (sb_publishable_, sb_secret_)

### **"JWT_SECRET environment variable is required":**
- Go to **Settings** → **Environment Variables**
- Verify JWT_SECRET is set for all environments
- Redeploy the application

---

## **✅ Success Checklist**

- [ ] Project imported from GitHub
- [ ] All 8 environment variables added
- [ ] Deployment completed successfully
- [ ] Live site accessible
- [ ] Signup/login/logout working
- [ ] Secure cookies set (no tokens in localStorage)
- [ ] No authentication errors in logs

---

## **🎉 You're Live!**

Your Booze & Books application is now deployed with:
- ✅ **Enterprise-grade custom JWT authentication**
- ✅ **Secure environment variable handling**
- ✅ **Automatic HTTPS and SSL**
- ✅ **Global CDN distribution**
- ✅ **Automatic deployments on GitHub pushes**

**Your secure authentication system is now live on the web! 🔐**

---

## **📋 Quick Reference - Environment Variables**

Copy these names exactly when adding to Vercel:

```
JWT_SECRET
JWT_ALGORITHM
JWT_EXPIRES_IN
JWT_ISSUER
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DAILY_REMINDER_TOKEN
```

**Remember**: Get the actual values from your local `.env` file!

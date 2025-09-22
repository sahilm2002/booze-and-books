# 🌐 Cloudflare Custom Domain Setup for Vercel - Booze & Books

## Overview
This guide will help you connect your custom domain purchased through Cloudflare to your existing Vercel deployment of the Booze & Books application.

---

## **Prerequisites**
- ✅ Domain purchased through Cloudflare
- ✅ Booze & Books app already deployed on Vercel
- ✅ Access to both Cloudflare and Vercel dashboards

---

## **Step 1: Access Your Vercel Project**

1. Go to **[vercel.com](https://vercel.com)** and log in
2. Navigate to your **"booze-and-books"** project
3. Click on the project to open its dashboard
4. Note your current Vercel URL (e.g., `https://booze-and-books-xyz.vercel.app`)

---

## **Step 2: Add Custom Domain in Vercel**

### **Navigate to Domains:**
1. In your Vercel project dashboard, click **"Settings"**
2. Click **"Domains"** in the left sidebar

### **Add Your Domain:**
1. Click **"Add"** button
2. Enter your custom domain (e.g., `yourdomain.com`)
3. Click **"Add"**

### **Add www Subdomain (Recommended):**
1. Click **"Add"** again
2. Enter `www.yourdomain.com`
3. Click **"Add"**
4. Vercel will show you the DNS records you need to configure

---

## **Step 3: Configure DNS in Cloudflare**

### **Access Cloudflare Dashboard:**
1. Go to **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. Log in to your account
3. Click on your domain name

### **Navigate to DNS Settings:**
1. Click **"DNS"** in the left sidebar
2. You'll see the DNS records management interface

---

## **Step 4: Add Required DNS Records**

Vercel will provide you with specific DNS records. Typically, you'll need to add:

### **For Root Domain (yourdomain.com):**

#### **Option A: CNAME Record (Recommended)**
- **Type**: `CNAME`
- **Name**: `@` (or leave blank for root)
- **Target**: `cname.vercel-dns.com`
- **TTL**: `Auto` or `300`
- **Proxy Status**: 🟠 **DNS Only** (turn off Cloudflare proxy initially)

#### **Option B: A Record (Alternative)**
If CNAME doesn't work for root domain:
- **Type**: `A`
- **Name**: `@`
- **IPv4 Address**: `76.76.19.61` (Vercel's IP)
- **TTL**: `Auto` or `300`
- **Proxy Status**: 🟠 **DNS Only**

### **For www Subdomain:**
- **Type**: `CNAME`
- **Name**: `www`
- **Target**: `cname.vercel-dns.com`
- **TTL**: `Auto` or `300`
- **Proxy Status**: 🟠 **DNS Only**

### **Important Notes:**
- ⚠️ **Start with Proxy Status OFF** (DNS Only - gray cloud)
- ✅ Delete any existing A or CNAME records for `@` and `www` that might conflict
- 🔄 DNS changes can take up to 48 hours to propagate (usually much faster)

---

## **Step 5: Verify Domain Configuration**

### **In Vercel:**
1. Go back to your Vercel project → **Settings** → **Domains**
2. Wait for the status to change from "Pending" to "Valid"
3. This may take 5-60 minutes

### **Test Your Domain:**
1. Open a new browser tab
2. Navigate to `https://yourdomain.com`
3. Verify your Booze & Books app loads correctly
4. Test `https://www.yourdomain.com` as well

---

## **Step 6: Enable Cloudflare Proxy (Optional)**

Once your domain is working correctly:

### **Benefits of Enabling Proxy:**
- 🚀 **Performance**: Cloudflare CDN acceleration
- 🛡️ **Security**: DDoS protection and WAF
- 📊 **Analytics**: Traffic insights
- ⚡ **Caching**: Faster load times

### **Enable Proxy:**
1. In Cloudflare DNS settings
2. Click the gray cloud ☁️ next to your DNS records
3. Turn it orange 🟠 (Proxied)
4. Do this for both `@` and `www` records

### **Configure SSL/TLS:**
1. In Cloudflare, go to **SSL/TLS** → **Overview**
2. Set encryption mode to **"Full (strict)"**
3. This ensures end-to-end encryption between Cloudflare and Vercel

---

## **Step 7: Configure Redirects (Optional)**

### **Redirect www to non-www (or vice versa):**

#### **In Vercel (Recommended):**
1. Go to **Settings** → **Domains**
2. Click the gear icon ⚙️ next to one of your domains
3. Set up redirect from `www.yourdomain.com` → `yourdomain.com` (or vice versa)

#### **In Cloudflare (Alternative):**
1. Go to **Rules** → **Redirect Rules**
2. Create rule to redirect `www.yourdomain.com` to `yourdomain.com`

---

## **Step 8: Update Environment Variables (If Needed)**

If your app uses absolute URLs or domain-specific configurations:

1. In Vercel, go to **Settings** → **Environment Variables**
2. Update any variables that reference your domain
3. **Redeploy** your application after changes

---

## **🚨 Troubleshooting**

### **Domain Shows "Invalid Configuration":**
- ✅ Verify DNS records are correct
- ✅ Wait longer (DNS propagation can take time)
- ✅ Try using A record instead of CNAME for root domain

### **SSL Certificate Issues:**
- ✅ Ensure Cloudflare SSL/TLS is set to "Full (strict)"
- ✅ Wait for Vercel to provision SSL certificate
- ✅ Try disabling Cloudflare proxy temporarily

### **Site Not Loading:**
- ✅ Check DNS propagation: Use [whatsmydns.net](https://whatsmydns.net)
- ✅ Verify no conflicting DNS records exist
- ✅ Test with proxy disabled first

### **Redirect Loops:**
- ✅ Check Cloudflare SSL/TLS settings
- ✅ Ensure redirect rules aren't conflicting
- ✅ Verify Vercel domain configuration

---

## **✅ Success Checklist**

- [ ] Domain added in Vercel
- [ ] DNS records configured in Cloudflare
- [ ] Domain status shows "Valid" in Vercel
- [ ] Site loads at custom domain
- [ ] SSL certificate is active
- [ ] www redirect working (if configured)
- [ ] Cloudflare proxy enabled (optional)

---

## **🎉 You're Live with Custom Domain!**

Your Booze & Books application is now accessible at your custom domain with:
- ✅ **Custom domain with SSL**
- ✅ **Cloudflare CDN and security** (if proxy enabled)
- ✅ **Automatic HTTPS redirect**
- ✅ **Professional appearance**

---

## **📋 Quick DNS Reference**

### **Required DNS Records:**
```
Type: CNAME
Name: @
Target: cname.vercel-dns.com
Proxy: DNS Only (initially)

Type: CNAME  
Name: www
Target: cname.vercel-dns.com
Proxy: DNS Only (initially)
```

### **Alternative for Root Domain:**
```
Type: A
Name: @
IPv4: 76.76.19.61
Proxy: DNS Only (initially)
```

---

## **🔧 Advanced Configuration**

### **Custom Headers (Optional):**
In Vercel, you can add custom headers via `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

### **Cloudflare Page Rules:**
- Set up caching rules for static assets
- Configure security settings
- Set up custom error pages

**Your professional domain is now live! 🌐**

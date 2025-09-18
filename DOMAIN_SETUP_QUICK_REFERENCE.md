# 🚀 Quick Reference: Cloudflare Domain → Vercel Setup

## **What You Need**
- Your custom domain name (e.g., `yourdomain.com`)
- Access to Cloudflare dashboard
- Access to Vercel dashboard

---

## **Step-by-Step (5 Minutes)**

### **1. In Vercel:**
1. Go to your **booze-and-books** project
2. **Settings** → **Domains**
3. Click **"Add"** → Enter `yourdomain.com` → **Add**
4. Click **"Add"** → Enter `www.yourdomain.com` → **Add**

### **2. In Cloudflare:**
1. Go to **DNS** settings for your domain
2. **Delete** any existing `@` and `www` records
3. **Add** these two records:

```
Type: CNAME | Name: @ | Target: cname.vercel-dns.com | Proxy: OFF (gray cloud)
Type: CNAME | Name: www | Target: cname.vercel-dns.com | Proxy: OFF (gray cloud)
```

### **3. Wait & Verify:**
- Wait 5-60 minutes for DNS propagation
- Check Vercel domains page for "Valid" status
- Test `https://yourdomain.com` in browser

### **4. Enable Cloudflare Proxy (Optional):**
- Turn clouds orange 🟠 in Cloudflare DNS
- Set SSL/TLS to **"Full (strict)"**

---

## **⚠️ Common Issues**

| Problem | Solution |
|---------|----------|
| "Invalid Configuration" | Wait longer, try A record with IP from Vercel project → Settings → Domains (commonly `76.76.21.21` but may vary) |
| SSL errors | Set Cloudflare SSL to "Full (strict)" |
| Site not loading | Check DNS propagation at whatsmydns.net |
| Redirect loops | Disable Cloudflare proxy temporarily |

---

## **✅ Success = Your app loads at your custom domain!**

**Need detailed help?** → See `CLOUDFLARE_DOMAIN_SETUP.md`

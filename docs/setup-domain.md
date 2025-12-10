# Setting Up ops.handledcommerce.com

This guide prepares the system to work with both the IP address and the domain.

## Step 1: Deploy Updated Code (Do This Now)

```bash
# On your local machine - commit and push
git add apps/backoffice/api/src/index.ts docs/
git commit -m "feat: configure system for ops.handledcommerce.com domain"
git push origin main

# On the server
ssh root@YOUR_SERVER_IP
cd /var/www/handled
git pull origin main
cd apps/backoffice/api
pnpm run build
pm2 restart handled-api
```

## Step 2: Update Nginx Configuration (Do This Now)

```bash
# On the server
sudo nano /etc/nginx/sites-available/handled

# Change the server_name line from:
#   server_name 167.99.166.9;
# To:
#   server_name 167.99.166.9 ops.handledcommerce.com;

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 3: DNS Setup (Wait for Domain Admin)

**Have your domain administrator add this DNS record:**

```
Type: A
Name: ops
Value: 167.99.166.9
TTL: 3600 (or Auto)
```

**Test DNS propagation:**
```bash
# From your local machine
dig ops.handledcommerce.com

# Should show:
# ops.handledcommerce.com.  3600  IN  A  167.99.166.9
```

**Once DNS is working:**
1. Visit `http://ops.handledcommerce.com` in browser
2. Should work immediately (same site as IP)
3. Cookie will work (secure: false allows HTTP)

## Step 4: Add HTTPS with Let's Encrypt (After DNS Works)

```bash
# On the server - Install Certbot (if not already installed)
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (interactive - will ask for email)
sudo certbot --nginx -d ops.handledcommerce.com

# Certbot will:
# - Generate SSL certificate
# - Update Nginx config automatically
# - Set up auto-renewal

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 5: Enable Secure Cookies (After HTTPS Works)

```bash
# On your local machine
# Edit apps/backoffice/api/src/auth/lucia.ts
# Change line 11-12 from:
#   // Set to false for IP-based access without HTTPS
#   // TODO: Set to true when using HTTPS with a domain
#   secure: false,
# To:
#   secure: process.env.NODE_ENV === 'production',

# Commit and deploy
git add apps/backoffice/api/src/auth/lucia.ts
git commit -m "feat: enable secure cookies with HTTPS"
git push origin main

# On server
cd /var/www/handled
git pull origin main
cd apps/backoffice/api
pnpm run build
pm2 restart handled-api
```

## Step 6: Update CORS (After HTTPS Works)

```bash
# On your local machine
# Edit apps/backoffice/api/src/index.ts
# Remove the temporary HTTP line:
#   'http://ops.handledcommerce.com', // Temporary for DNS testing before SSL

# Final CORS should be:
#   origin: process.env.NODE_ENV === 'production'
#     ? [
#         'http://167.99.166.9',  // Keep for direct IP access
#         'https://ops.handledcommerce.com',
#       ]
#     : ['http://localhost:5173', 'http://localhost:3000'],

# Commit and deploy (same as Step 5)
```

## Testing Checklist

After each step, test:

- [ ] Step 1: IP address still works: `http://167.99.166.9`
- [ ] Step 3: Domain works: `http://ops.handledcommerce.com`
- [ ] Step 4: HTTPS works: `https://ops.handledcommerce.com`
- [ ] Step 4: HTTP redirects to HTTPS (Certbot auto-configures)
- [ ] Step 5: Login works on HTTPS (secure cookie)
- [ ] Step 5: Users and Roles pages work

## Current Status

- ✅ Code supports both IP and domain
- ⏳ Waiting for DNS setup
- ⏳ HTTPS setup pending (after DNS)

## Rollback Plan

If anything breaks:
```bash
# On server
cd /var/www/handled
git log --oneline -5  # Find previous commit hash
git reset --hard <previous-commit-hash>
cd apps/backoffice/api
pnpm run build
pm2 restart handled-api
```


# SimpleSwap Polygon Checkout - Deployment Guide

## Overview

This guide covers the deployment process for the Phase 2 production-ready SimpleSwap Polygon checkout system. The application is designed to be deployed on various platforms with minimal configuration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Process](#build-process)
3. [Deployment Options](#deployment-options)
4. [Environment Configuration](#environment-configuration)
5. [Security Checklist](#security-checklist)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring Setup](#monitoring-setup)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools
- Node.js 14+ (for build process) OR bash (for simple build)
- Git
- Web server (Nginx, Apache, or cloud hosting)
- SSL certificate (required for production)

### Environment Requirements
- HTTPS enabled (required for Clipboard API and PWA)
- Modern browser support (Chrome 80+, Firefox 75+, Safari 13+)
- Minimum server requirements: 512MB RAM, 1 CPU core

## Build Process

### Option 1: Node.js Build (Recommended)

```bash
# Install dependencies
npm install

# Run production build
npm run build

# The optimized files will be in the 'dist' directory
```

### Option 2: Simple Shell Build

```bash
# Make build script executable
chmod +x build-simple.sh

# Run build
./build-simple.sh

# The optimized files will be in the 'dist' directory
```

### Build Output

The build process creates:
- Minified and bundled JavaScript files
- Optimized CSS with mobile-specific styles
- Production-ready HTML with all optimizations
- Service worker for offline functionality
- Build manifest with file hashes

## Deployment Options

### 1. Static Hosting (Netlify, Vercel, GitHub Pages)

```bash
# Deploy to Netlify
netlify deploy --prod --dir=dist

# Deploy to Vercel
vercel --prod dist

# Deploy to GitHub Pages
# Push dist folder to gh-pages branch
```

### 2. Traditional Web Server (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name checkout.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # CSP Header
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://api.simpleswap.io https://exchange.mercuryo.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.simpleswap.io https://api.mercuryo.io https://ipapi.co https://exchange.mercuryo.io; img-src 'self' data: https:; frame-src 'self' https://exchange.mercuryo.io; frame-ancestors 'none';" always;
    
    root /var/www/simpleswap-checkout/dist;
    index index.html;
    
    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Service Worker
    location /sw.js {
        add_header Cache-Control "no-cache";
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name checkout.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Docker Container

```dockerfile
FROM nginx:alpine

# Copy built files
COPY dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1
```

### 4. Cloud Providers

#### AWS S3 + CloudFront
```bash
# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

#### Google Cloud Storage + CDN
```bash
# Upload to GCS
gsutil -m rsync -r -d dist/ gs://your-bucket-name

# Set cache headers
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" gs://your-bucket-name/js/*.js
```

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file:

```bash
# API Configuration
SIMPLESWAP_API_KEY=your_api_key_here
MERCURYO_WIDGET_ID=your_widget_id_here

# Deployment
DEPLOYMENT_TARGET=production
DEPLOYMENT_REGION=us-east-1
CDN_URL=https://cdn.yourdomain.com

# Monitoring
GA_ENABLED=true
GA_MEASUREMENT_ID=G-XXXXXXXXXX
SENTRY_ENABLED=true
SENTRY_DSN=https://xxx@sentry.io/xxx

# Security
SESSION_SECRET=generate_secure_random_string
CSP_REPORT_URI=https://yourdomain.com/csp-report

# Error Reporting
ERROR_REPORTING_URL=https://api.yourdomain.com/errors
LOG_ENDPOINT=https://api.yourdomain.com/logs
```

### Configuration Updates

Before deployment, update these files:

1. **config/config.js**
   - Set your wallet address
   - Configure amount and currency
   - Add Mercuryo widget ID

2. **config/production.config.js**
   - Update API endpoints if using custom domains
   - Configure CDN URLs
   - Set analytics endpoints

## Security Checklist

- [ ] SSL certificate installed and configured
- [ ] Security headers configured (see nginx example)
- [ ] CSP policy reviewed and tested
- [ ] API keys secured and not exposed in client code
- [ ] Input validation enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Regular security updates scheduled

## Performance Optimization

### Pre-deployment Checklist

- [ ] JavaScript and CSS minified
- [ ] Images optimized and compressed
- [ ] Lazy loading implemented
- [ ] Service worker registered
- [ ] Resource hints added (preconnect, dns-prefetch)
- [ ] Critical CSS inlined
- [ ] Gzip/Brotli compression enabled

### CDN Configuration

1. **Static Assets**
   ```bash
   # Upload static assets to CDN
   aws s3 sync dist/js s3://cdn-bucket/js --cache-control "max-age=31536000"
   aws s3 sync dist/css s3://cdn-bucket/css --cache-control "max-age=31536000"
   ```

2. **Update Asset URLs**
   - Configure `CDN_URL` in production config
   - Build process will automatically use CDN URLs

### Performance Monitoring

- Set up Core Web Vitals monitoring
- Configure performance budgets
- Enable Real User Monitoring (RUM)

## Monitoring Setup

### 1. Health Check Endpoint

The application provides a health check at `/api/health` (client-side):

```javascript
// Access health status
window.getHealthStatus().then(status => {
    console.log('Health:', status);
});
```

### 2. Error Tracking (Sentry)

```javascript
// Sentry is automatically configured if SENTRY_DSN is provided
// Additional configuration in monitoring.config.js
```

### 3. Analytics Setup

1. **Google Analytics**
   - Add GA measurement ID to environment
   - Verify tracking in GA Real-Time view

2. **Custom Analytics**
   - Configure endpoint in monitoring.config.js
   - Set up backend to receive analytics data

### 4. Uptime Monitoring

Configure external monitoring:
- Pingdom, UptimeRobot, or similar
- Monitor `/` and `/api/health`
- Set up alerts for downtime

## Troubleshooting

### Common Issues

1. **Clipboard API not working**
   - Ensure HTTPS is enabled
   - Check browser permissions

2. **Service Worker not registering**
   - Verify HTTPS
   - Check console for errors
   - Clear browser cache

3. **CSP violations**
   - Check browser console
   - Review CSP report endpoint logs
   - Adjust CSP policy as needed

4. **Mobile issues**
   - Test on real devices
   - Check viewport meta tag
   - Verify touch targets are 44x44px minimum

### Debug Mode

Enable debug mode with URL parameter:
```
https://checkout.yourdomain.com?debug=true
```

This shows:
- Monitoring dashboard
- Detailed logging
- Performance metrics

### Logs

Check logs in these locations:
- Browser console (development)
- Server error logs
- CDN logs
- Analytics dashboard
- Error tracking service

## Post-Deployment

### Verification Checklist

- [ ] SSL certificate valid and not expiring soon
- [ ] All API endpoints accessible
- [ ] Service worker registered and caching assets
- [ ] Analytics tracking working
- [ ] Error reporting functional
- [ ] Performance metrics within budget
- [ ] Mobile experience optimized
- [ ] Health check endpoint responding

### Monitoring Dashboard

Access the monitoring dashboard (when enabled):
1. Add `?debug=true` to URL
2. View real-time metrics
3. Check API status
4. Monitor error rates

### Maintenance

1. **Regular Updates**
   - Security patches
   - Dependency updates
   - Performance improvements

2. **Backup Strategy**
   - Regular backups of configuration
   - Version control for all changes
   - Rollback plan ready

3. **Scaling**
   - Monitor traffic patterns
   - Scale infrastructure as needed
   - Implement caching strategies

## Support

For deployment issues:
1. Check deployment logs
2. Review browser console
3. Verify configuration
4. Test health endpoint

For additional help, refer to the main README.md or create an issue in the repository.
# Deployment Guide

## Overview
Guide for deploying istopphish backend to production and publishing extension to Chrome Web Store.

## Backend Deployment

### Option 1: Render (Recommended)

**Easiest deployment option with free tier support.**

1. **Create Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create Web Service**
   - New → Web Service
   - Connect GitHub repo
   - Select repository

3. **Configure**
   ```
   Environment: Python 3.11
   Build Command: pip install -r backend/requirements.txt
   Start Command: gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app
   ```

4. **Environment Variables**
   - Add in Dashboard → Settings → Environment
   ```
   HUGGINGFACE_API_KEY=hf_your_token
   BACKEND_PORT=8000
   ALLOWED_ORIGINS=chrome-extension://*,https://yourdomain.com
   LLM_TIMEOUT_SECONDS=10
   ```

5. **Deploy**
   - Automatically deploys on git push
   - Free tier: 750 hours/month (always-on)
   - URL: `https://yourdomain.onrender.com`

### Option 2: Railway

**Good for scalability and custom domains.**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set HUGGINGFACE_API_KEY=hf_xxx

# Deploy
railway up

# Get URL
railway status
```

**Pricing:**
- Free tier: $5 credit/month
- Pay-as-you-go: $0.000116/GB-hour
- Starting ~$5-10/month

### Option 3: AWS Lambda + API Gateway

```bash
# Install Zappa
pip install zappa

# Initialize
zappa init

# Deploy
zappa deploy production

# Update
zappa update production
```

**Pros:**
- Serverless (auto-scale)
- Pay per request (~$0.0000002 per invocation)
- Free tier: 1 million requests/month

**Cons:**
- Complex setup
- Cold start delays (2-5 sec)

### Option 4: Docker + Any Cloud

**Generic approach works anywhere.**

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build & Deploy:**
```bash
# Build image
docker build -t istopphish-backend .

# Run locally
docker run -p 8000:8000 \
  -e HUGGINGFACE_API_KEY=hf_xxx \
  istopphish-backend

# Push to Docker Hub
docker tag istopphish-backend username/istopphish
docker push username/istopphish

# Deploy to any service (DigitalOcean, Heroku, etc.)
```

## Extension Publication

### Pre-Publication Checklist

- [ ] Test on Chrome 112+
- [ ] All permissions justified
- [ ] Privacy policy written
- [ ] Icons created (128x128, 48x48, 16x16)
- [ ] Screenshots taken (1280x800)
- [ ] Description updated
- [ ] No hardcoded API keys
- [ ] Backend URL configurable
- [ ] Error handling complete

### Creating Store Assets

**1. Extension Icon (128x128 PNG)**
- Create icon with gradient background
- Save as `src/icons/icon128.png`
- Also create 48x48 and 16x16 versions

**2. Screenshots (1280x800)**
- Screenshot 1: Popup showing threat detection
- Screenshot 2: Settings page
- Screenshot 3: Warning banner on page
- Format: PNG or JPEG

**3. Promotional Images (440x280)**
- Featured tile for store
- Show extension benefits

### Publishing Steps

1. **Create Developer Account**
   - Go to https://chrome.google.com/webstore
   - Sign up for Chrome Web Store Developer
   - Pay one-time $5 fee

2. **Prepare Package**
   ```bash
   # Create ZIP file of src/ folder
   cd src
   zip -r ../istopphish-extension.zip .
   ```

3. **Submit for Review**
   - Go to Developer Dashboard
   - New Item → Upload ZIP
   - Fill required fields:
     - Name: istopphish
     - Description: Brief description
     - Detailed Description: Feature overview
     - Category: Productivity, Security
     - Languages: English
   - Upload screenshots
   - Upload promotional images

4. **Privacy Policy**
   - Add to manifest.json:
   ```json
   {
     "homepage_url": "https://istopphish.com"
   }
   ```
   - Create privacy policy page
   - Link from store listing

5. **Submit for Review**
   - Click "Submit for Review"
   - Review takes 3-7 days
   - Google checks:
     - Functionality
     - Permissions justified
     - Privacy compliance
     - Content policies

6. **After Approval**
   - Extension appears in Chrome Web Store
   - Users can install with one click
   - Automatic updates on version bump

### Store Listing Template

```
NAME: istopphish - AI Phishing Detection

SHORT DESCRIPTION (132 chars):
AI-powered phishing detector using advanced machine learning. 
Protect yourself from credential theft.

DETAILED DESCRIPTION:
istopphish is a browser extension that uses artificial intelligence 
to detect phishing scams in real-time.

KEY FEATURES:
✓ AI-powered threat detection
✓ Offline heuristic analysis
✓ Real-time warning banners
✓ Whitelist management
✓ Privacy-first design (data stays local)

HOW IT WORKS:
1. Analyzes page content for suspicious patterns
2. Highlights potentially malicious elements
3. Shows risk assessment with confidence score
4. Users can whitelist trusted domains

PRIVACY:
- No passwords or payment data sent to backend
- Local analysis works completely offline
- Optional LLM analysis for complex threats
- User can disable online features

SUPPORT:
- GitHub: https://github.com/istopphish
- Issues: https://github.com/istopphish/issues
- Privacy: https://istopphish.com/privacy
```

## Post-Launch Maintenance

### Version Updates

```bash
# Update version in manifest.json
{
  "version": "1.1.0"
}

# Commit and push
git add src/manifest.json
git commit -m "v1.1.0: Add email analysis"
git push

# Upload new ZIP to developer dashboard
# Changes live within hours
```

### Monitoring

1. **User Reviews**
   - Check Chrome Web Store daily
   - Address 1-star reviews quickly
   - Reply to questions

2. **Crash Reports**
   - Monitor GitHub Issues
   - Check extension error logs (DevTools)

3. **Analytics (Optional)**
   - Add Google Analytics to background.js
   - Track: installations, active users, crashes
   - Respect privacy (no page data)

### Bug Fixes

```bash
# Fix critical bugs ASAP
git checkout main
# Make fix
git commit -m "Fix: Backend timeout issue"
git push

# Upload new version
# Google typically approves updates within 24h
```

## Scaling Considerations

### Backend Load Estimation

- Average user: 10-20 analyses/day
- Peak time: 50+ analyses/second
- Storage: Minimal (cache only)

### Optimization Steps

1. **If 100+ users:**
   - Enable response caching
   - Add Redis for distributed cache
   - Monitor API costs

2. **If 1,000+ users:**
   - Scale to multiple backend instances
   - Use load balancer
   - Add CDN for static assets

3. **If 10,000+ users:**
   - Dedicated LLM inference endpoints
   - Database for threat intelligence
   - Advanced analytics

### Cost Estimation (Monthly)

| Users | Render | Railway | AWS Lambda |
|-------|--------|---------|-----------|
| 100 | $7 | $10 | $5 |
| 1,000 | $7 | $25 | $10 |
| 10,000 | $7 | $100 | $50 |
| 100,000 | $20 | $500+ | $300+ |

## Security for Production

### API Key Management
```env
# .env (never commit!)
HUGGINGFACE_API_KEY=hf_xxx

# Use secrets manager in production
# Render: Environment secrets
# Railway: Variables (encrypted)
# AWS: Secrets Manager
```

### CORS Configuration
```python
# Allow only your domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "chrome-extension://your-extension-id",
        "https://yourdomain.com"
    ]
)
```

### Rate Limiting
```python
# Enforce strict rate limits
# Per IP: 100 req/hour (default)
# Per user: 1000 req/day
```

### SSL/HTTPS
- All major hosting providers include free SSL
- Always use HTTPS in extension settings
- Render/Railway auto-enable HTTPS

## Monitoring & Analytics

### Basic Monitoring
```python
# Add to backend
import logging
logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.FileHandler("istopphish.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
logger.info(f"Analysis request: {url} → {risk_level}")
```

### Error Tracking (Optional)
```python
# Add Sentry for error monitoring
pip install sentry-sdk
import sentry_sdk
sentry_sdk.init("https://your-sentry-url")
```

## Rollback Procedure

**If critical bug in production:**

1. **Immediate:**
   ```bash
   git revert HEAD~1
   git push
   # Render auto-deploys
   ```

2. **Extension:**
   - Upload previous version to Chrome Web Store
   - Review takes ~1 hour
   - Users auto-update within 24h

3. **Communication:**
   - Post issue on GitHub
   - Update extension description
   - Reply to user reviews

## Continuous Integration

**Optional: Auto-test on push**

```yaml
# .github/workflows/test.yml
name: Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/
```

---

## Deployment Checklist

- [ ] Backend deployed and online
- [ ] `/health` endpoint responding
- [ ] LLM analysis working
- [ ] Extension pointing to correct backend URL
- [ ] Extension tested on multiple sites
- [ ] Extension icons created (all sizes)
- [ ] Screenshots captured
- [ ] Privacy policy written
- [ ] Store listing completed
- [ ] Submitted for Chrome Web Store review
- [ ] Monitoring in place

---

**Next: Monitor reviews and gather user feedback for improvements!**

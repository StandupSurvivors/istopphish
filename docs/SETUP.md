# Setup & Installation Guide

## Overview
istopphish is a browser extension for detecting phishing scams using AI/LLM analysis. It combines:
- **Client-side heuristics** for instant detection
- **Backend LLM analysis** for intelligent classification
- **Vue.js UI** for user interaction
- **FastAPI backend** for API and LLM integration

## System Requirements

### For Extension (Minimum)
- Chrome/Chromium browser (version 112+)
- 5 MB disk space

### For Backend (Development)
- Python 3.9+
- pip (Python package manager)
- Hugging Face API key (free: https://huggingface.co/settings/tokens)

## Quick Start

### 1. Set Up Backend

```bash
# Navigate to backend folder
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Add your Hugging Face API key to .env
# HUGGINGFACE_API_KEY=hf_your_token_here

# Start backend server
python main.py
```

Backend will run on `http://localhost:8000`

### 2. Install Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `src/` folder
5. Extension should appear in your toolbar

### 3. Configure Extension

1. Click the istopphish icon in toolbar
2. Click ⚙️ (Settings)
3. Verify Backend URL: `http://localhost:8000`
4. Click "Test Connection" to verify

## Backend API Endpoints

### Health Check
```bash
GET /health
Response: {"status": "healthy", "version": "1.0.0", "llm_available": true}
```

### Analyze URL
```bash
POST /api/analyze-url
Content-Type: application/json

{
  "url": "https://example.com",
  "page_content": "Page text content",
  "local_detections": [
    {
      "type": "suspicious_form",
      "severity": "high",
      "details": {}
    }
  ]
}

Response:
{
  "url": "https://example.com",
  "risk_level": "high|medium|low|safe",
  "confidence": 85,
  "reasoning": "Form submits to external domain",
  "action": "warn|block|safe",
  "phishing_indicators": ["suspicious_form", "external_redirect"],
  "timestamp": 1234567890
}
```

### Analyze Page
```bash
POST /api/analyze-page
Content-Type: application/json

{
  "url": "https://example.com",
  "html_content": "<html>...</html>",
  "timestamp": 1234567890
}

Response:
{
  "url": "https://example.com",
  "overall_risk": "high",
  "confidence": 75,
  "detected_threats": [
    {
      "type": "suspicious_form",
      "url": "https://malicious.com/steal"
    }
  ],
  "recommendations": ["Do not enter credentials", "Report to Google"],
  "timestamp": 1234567890
}
```

## Hugging Face LLM Configuration

### Get API Key
1. Go to https://huggingface.co/settings/tokens
2. Create new token with **read** permission
3. Copy token to `.env` file

### Using Different Models
Edit `backend/.env`:
```
# Default: mistralai/Mistral-7B-Instruct-v0.1
# Other options:
# - meta-llama/Llama-2-7b-chat-hf (Llama)
# - gpt2 (lighter, faster)
LLM_MODEL=mistralai/Mistral-7B-Instruct-v0.1
```

## Extension Configuration

### Default Settings
- **Sensitivity**: Medium
- **Enable Highlighting**: Yes
- **Show Warnings**: Yes
- **LLM Analysis**: Yes (if backend available)
- **Local Analysis**: Yes

### Advanced Settings
Edit manifest in `src/manifest.json`:
```json
{
  "host_permissions": ["<all_urls>"],  // Scan all websites
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "tabs"
  ]
}
```

## Troubleshooting

### Extension Not Loading
1. Check manifest.json is valid (use JSON validator)
2. Ensure src/ folder exists with all files
3. Try reloading extension: refresh icon in chrome://extensions/

### Backend Connection Failed
1. Verify FastAPI is running: `curl http://localhost:8000/health`
2. Check .env has correct `HUGGINGFACE_API_KEY`
3. Check firewall allows port 8000
4. Try changing `BACKEND_PORT` in .env

### LLM Analysis Slow
- First request is slow (model loading)
- Subsequent requests should be ~1-2 seconds
- Check Hugging Face API status
- Try reducing `LLM_TIMEOUT_SECONDS` in .env

### Chrome Says Extension Has Errors
- Open DevTools: right-click extension → Manage Extensions → Details
- Check errors in "Errors" section
- Look for syntax errors in JavaScript files

## Development Tips

### Running in Debug Mode
1. Open DevTools for extension: click Details → Inspect views: background page
2. Check Console for errors
3. Use `logger.debug()` calls throughout code

### Testing Local Analysis (No Backend)
1. Disable backend in Settings → uncheck "Use LLM Analysis"
2. Extension will use heuristics only
3. Works completely offline

### Adding Custom Phishing Patterns
Edit `backend/services/phishing_analyzer.py`:
```python
def _is_suspicious_domain(self, domain: str) -> bool:
    # Add your patterns here
    patterns = [
        r'paypal-security',  # New pattern
        r'-confirm-',
    ]
    return any(re.search(pattern, domain, re.IGNORECASE) for pattern in patterns)
```

## Deployment

### Backend Deployment Options

#### Option 1: Render (Recommended for beginners)
```bash
# Create Render account at https://render.com
# Connect GitHub repository
# Render auto-deploys on git push
```

#### Option 2: Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway up
```

#### Option 3: AWS Lambda
```bash
# Requires AWS account
# Use Zappa framework
pip install zappa
zappa init
zappa deploy production
```

### Configure Extension for Production Backend
1. Open extension Settings
2. Change Backend URL to: `https://your-backend-domain.com`
3. Test connection

## Performance Optimization

### Backend
- Enable caching with Redis
- Use uvicorn workers: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app`
- Add rate limiting per IP

### Extension
- Cache analysis results (24h TTL)
- Lazy-load Vue components
- Use RequestIdleCallback for non-urgent tasks

## Security Considerations

- Never send passwords/credit cards to backend
- User can disable LLM analysis for offline-only mode
- Whitelist sensitive domains (banks, etc.)
- Keep HF API key secret in .env (never commit)

## Getting Help

- Check GitHub Issues: https://github.com/istopphish/issues
- Review API.md for endpoint details
- Test with curl before using extension

## Next Steps

1. ✅ Complete this setup
2. Test local analysis on different sites
3. Enable backend LLM analysis
4. Deploy backend to production
5. Publish extension to Chrome Web Store

---
**For more details, see API.md and LLM_INTEGRATION.md**

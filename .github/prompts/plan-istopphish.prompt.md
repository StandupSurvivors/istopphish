# istopphish: Browser Extension for LLM-Based Phishing Detection

## Overview
Build a comprehensive browser extension that detects phishing scams using LLM capabilities, combining:
- **Frontend**: Vue.js (popup UI, options page, settings)
- **Backend**: FastAPI (API endpoints for LLM analysis)
- **AI Model**: Hugging Face Inference API with Mistral-7B-Instruct
- **Content Script**: Enhanced client-side detection with backend analysis

## Current State
The project has a basic Manifest V3 extension with:
- `content.js`: Heuristic-based detection (suspicious links, forms, redirects, unencrypted password inputs)
- `manifest.json`: Minimal configuration, only active on Google.com
- Console-only logging, no UI or backend

## Architecture

### 3-Tier System
```
┌─────────────────────────────────────────────────────────┐
│             Browser Extension (Vue.js)                  │
│  ├─ Popup UI (warnings, quick actions)                  │
│  ├─ Options Page (settings, whitelist)                  │
│  └─ Content Script (page analysis, DOM highlighting)    │
└───────────────┬─────────────────────────────────────────┘
                │ HTTP/JSON
┌───────────────▼─────────────────────────────────────────┐
│           FastAPI Backend                               │
│  ├─ /api/analyze-url (URL phishing risk)                │
│  ├─ /api/analyze-email (email content analysis)         │
│  ├─ /api/analyze-form (form field suspicious patterns) │
│  └─ /api/analyze-page (full page context)              │
└───────────────┬─────────────────────────────────────────┘
                │ API calls
┌───────────────▼─────────────────────────────────────────┐
│     Hugging Face Inference API (Mistral-7B)            │
│  - Prompt-engineered for phishing classification        │
│  - Confidence scoring & reasoning                       │
└─────────────────────────────────────────────────────────┘
```

## Project Structure
```
istopphish/
├── LICENSE
├── README.md
├── .gitignore
│
├── src/                          # Browser extension
│   ├── manifest.json            # Extension config (V3)
│   ├── background.js            # Service worker (message handling, storage)
│   ├── content.js               # Content script (DOM analysis, highlighting)
│   ├── popup.html               # Popup UI template
│   ├── popup.js                 # Vue.js popup logic
│   ├── popup.css                # Popup styling
│   ├── options.html             # Settings page
│   ├── options.js               # Settings Vue.js logic
│   ├── options.css              # Settings styling
│   ├── utils/
│   │   ├── messaging.js         # Message passing helpers
│   │   ├── storage.js           # Local storage abstractions
│   │   ├── config.js            # Extension configuration
│   │   └── logger.js            # Logging utility
│   ├── web/
│   │   └── content.js           # (existing - to be updated)
│   └── icons/                   # Extension icons
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── backend/                      # FastAPI server
│   ├── main.py                  # FastAPI app initialization
│   ├── requirements.txt          # Python dependencies
│   ├── config.py                # Backend configuration
│   ├── .env.example             # Environment variables template
│   ├── routers/
│   │   ├── analysis.py          # /api/analyze-* endpoints
│   │   └── health.py            # /health heartbeat
│   ├── services/
│   │   ├── llm_service.py       # Hugging Face integration
│   │   ├── phishing_analyzer.py # Phishing detection logic
│   │   └── cache.py             # Caching layer (Redis/in-memory)
│   ├── schemas/
│   │   ├── requests.py          # Pydantic request models
│   │   └── responses.py         # Pydantic response models
│   └── utils/
│       ├── prompts.py           # LLM prompt templates
│       ├── rate_limit.py        # Rate limiting
│       └── logging_config.py    # Logging setup
│
├── docs/
│   ├── SETUP.md                 # Installation & setup instructions
│   ├── API.md                   # API documentation
│   ├── LLM_INTEGRATION.md       # LLM configuration guide
│   └── DEPLOYMENT.md            # Production deployment guide
│
└── tests/
    ├── test_content_script.js   # Extension logic tests
    ├── test_backend.py          # FastAPI endpoint tests
    └── test_llm_service.py      # LLM integration tests
```

## Implementation Steps

### Phase 1: Project Structure & Manifest Update
1. Create folder structure (backend/, utils/, schemas/, etc.)
2. Update `manifest.json` for V3 compliance with permissions
3. Create `background.js` service worker
4. Create utility files (messaging, storage, config)

### Phase 2: Frontend - Vue.js UI
1. Create `popup.html/js/css` - Display detected threats, quick actions
2. Create `options.html/js/css` - Settings, whitelist, feedback
3. Integrate Vue 3 CDN or build process
4. Implement message passing to background/content scripts

### Phase 3: Content Script Enhancement
1. Update `content.js` with:
   - DOM highlighting of suspicious elements
   - Visual warning badges/tooltips
   - Message passing to backend
   - Event listeners for user interactions

### Phase 4: FastAPI Backend Setup
1. Initialize FastAPI project with skeleton
2. Create Pydantic schemas for requests/responses
3. Implement `/api/analyze-*` endpoints
4. Set up error handling and logging

### Phase 5: LLM Integration
1. Register Hugging Face account, get API token
2. Create `llm_service.py` with inference calls
3. Design prompt templates for phishing classification
4. Implement confidence scoring and reasoning

### Phase 6: Message Flow & Integration
1. Connect extension → backend HTTP calls
2. Implement request/response handling
3. Cache results (avoid redundant API calls)
4. Add rate limiting and error fallbacks

### Phase 7: Testing & Refinement
1. Unit tests for backend services
2. Integration tests for message flow
3. Manual testing across multiple websites
4. Performance optimization

### Phase 8: Documentation & Deployment
1. Write setup guide
2. Create API documentation
3. Deploy backend (Render, Railway, AWS, etc.)
4. Package extension for Chrome Web Store

## LLM Choice: Hugging Face Inference API + Mistral-7B-Instruct

### Why Mistral-7B-Instruct?
| Criteria | Mistral-7B | GPT-4 | Local ONNX |
|----------|-----------|-------|-----------|
| **Speed** | ~1-2s (API) | ~3-5s | <0.5s (setup heavy) |
| **Cost** | Free tier + cheap | $0.03/call | None (self-hosted) |
| **Accuracy** | High (7B params) | Highest | Medium (model dependent) |
| **Setup** | Minimal (API key) | API key | Complex (model + runtime) |
| **Privacy** | Cloud (tokens logged) | Cloud (logged) | Full local control |

**Recommendation**: Start with **Mistral-7B via Hugging Face Inference API** for quick development and good accuracy. Switch to local ONNX models in production if privacy is critical or usage scales significantly.

### Prompt Engineering for Phishing
```
System: You are a phishing detection expert. Analyze the given content and classify its phishing risk.

User Input:
- URL: [provided URL]
- Content: [page text, form fields, links]
- Heuristics: [suspicious patterns from content script]

Your task:
1. Assess phishing risk (Low/Medium/High/Critical)
2. Provide confidence (0-100%)
3. Explain reasoning (2-3 sentences)
4. Suggest user action (safe/verify/block)

Response format: JSON with fields {risk_level, confidence, reasoning, action}
```

## Key Features

### User-Facing
- **Popup Warning**: Shows detected threats with severity badges
- **Visual Highlighting**: Red outlines on suspicious links/forms
- **Quick Actions**: Report phishing, whitelist domain, settings
- **Settings Page**: Configure sensitivity, manage whitelist, view history

### Backend
- **Intelligent Analysis**: LLM-powered classification beyond heuristics
- **Rate Limiting**: 100 analyses/hour per user (extensible)
- **Caching**: Avoid re-analyzing same URLs within 24h
- **Error Fallback**: Graceful degradation if backend unavailable

### Extension
- **Works Offline**: Basic heuristics work without backend
- **Smart Requests**: Only send suspicious content for LLM analysis
- **Privacy Conscious**: No password/payment data sent to backend

## Configuration & Environment

### Backend `.env` Template
```
HUGGINGFACE_API_KEY=hf_xxxxx
BACKEND_PORT=8000
ALLOWED_ORIGINS=chrome-extension://xxxxx,http://localhost:3000
RATE_LIMIT_PER_HOUR=100
CACHE_TTL_HOURS=24
LOG_LEVEL=INFO
```

### Extension Config (manifest.json)
```json
{
  "manifest_version": 3,
  "name": "istopphish",
  "version": "1.0.0",
  "permissions": [
    "activeTab",
    "scriptExecute",
    "storage",
    "webRequest"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "istopphish - Phishing Detector"
  }
}
```

## Testing Strategy

1. **Unit Tests**: Prompt formatting, LLM response parsing, confidence scoring
2. **Integration Tests**: Message passing, backend endpoint responses
3. **Manual Testing**: 
   - Test sites with known phishing indicators (safe test URLs)
   - Verify highlighting and warnings display correctly
   - Check rate limiting and caching behavior
4. **Performance**: Analyze response times, cache hit rates

## Deployment Options (Phases 7-8)

| Platform | Cost | Ease | Scalability |
|----------|------|------|-------------|
| **Render** | Free tier + $7/mo | Easy (GitHub auto-deploy) | Good |
| **Railway** | Pay-as-you-go (~$5/mo typical) | Easy (CLI/GitHub) | Excellent |
| **AWS Lambda + API Gateway** | Free tier + $0.20/M requests | Medium | Excellent |
| **DigitalOcean App Platform** | $12/mo | Easy | Good |
| **Local Development** | Free | Easiest | None |

**Recommendation for MVP**: Start with **Render's free tier** for simplicity.

## Success Metrics

- Extension detects >80% of known phishing URLs
- Average analysis response time <2 seconds
- Zero false positives on legitimate banking sites
- User adoption (if published): 1000+ downloads in 3 months

## Next Immediate Actions

1. **Approve LLM choice**: Confirm Mistral-7B + Hugging Face is acceptable
2. **Set priorities**: Which phase to implement first?
3. **Get API keys**: Prepare Hugging Face account for inference API
4. **Begin Phase 1**: Create new folder structure and update manifest

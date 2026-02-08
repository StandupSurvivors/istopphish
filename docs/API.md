# API Documentation

## Overview
istopphish Backend API provides endpoints for phishing detection analysis using both heuristic and LLM-based approaches.

**Base URL**: `http://localhost:8000` (default)
**Version**: 1.0.0

## Authentication
Currently, no authentication is required. For production, add API key authentication:
```
Authorization: Bearer YOUR_API_KEY
```

## Rate Limiting
- Default: 100 requests per hour per client
- Configure in `.env`: `RATE_LIMIT_PER_HOUR=100`
- Returns 429 Too Many Requests when limit exceeded

## Endpoints

### 1. Health Check
**GET** `/health`

Check if backend is online and LLM is available.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "llm_available": true,
  "uptime_seconds": 3600.5
}
```

**Status Codes:**
- 200: OK

---

### 2. Analyze URL
**POST** `/api/analyze-url`

Analyze a single URL for phishing risk.

**Request:**
```json
{
  "url": "https://example.com",
  "page_content": "Optional page text content",
  "local_detections": [
    {
      "type": "suspicious_form",
      "severity": "high",
      "details": {
        "action": "https://evil.com",
        "has_password_field": true
      }
    }
  ],
  "user_context": {}
}
```

**Parameters:**
- `url` (string, required): Full URL to analyze
- `page_content` (string, optional): Text content of the page (max 5000 chars)
- `local_detections` (array, optional): Heuristic detections from client
  - `type` (string): Detection type (suspicious_link, suspicious_form, etc.)
  - `severity` (string): low, medium, high
  - `details` (object): Additional data
- `user_context` (object, optional): Additional context

**Response:**
```json
{
  "url": "https://example.com",
  "risk_level": "high",
  "confidence": 85,
  "reasoning": "Form submits to external domain with password field",
  "action": "block",
  "phishing_indicators": [
    "suspicious_form",
    "external_redirect"
  ],
  "details": {
    "form_count": 1,
    "external_links": 3
  },
  "timestamp": 1707333600
}
```

**Response Fields:**
- `risk_level` (string): safe, low, medium, high, critical
- `confidence` (number): 0-100
- `reasoning` (string): Explanation of result
- `action` (string): safe, verify, warn, block
- `phishing_indicators` (array): List of detected indicators
- `details` (object): Additional analysis details
- `timestamp` (number): Unix timestamp

**Status Codes:**
- 200: Success
- 400: Bad request
- 429: Rate limit exceeded
- 500: Server error

**Example (cURL):**
```bash
curl -X POST http://localhost:8000/api/analyze-url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://paypal-verify.com",
    "page_content": "Verify your account...",
    "local_detections": []
  }'
```

---

### 3. Analyze Page
**POST** `/api/analyze-page`

Analyze full HTML page content.

**Request:**
```json
{
  "url": "https://example.com",
  "html_content": "<html>...</html>",
  "timestamp": 1707333600
}
```

**Parameters:**
- `url` (string, required): Page URL
- `html_content` (string, required): Full HTML source code
- `timestamp` (number, optional): Request timestamp

**Response:**
```json
{
  "url": "https://example.com",
  "overall_risk": "high",
  "confidence": 75,
  "detected_threats": [
    {
      "type": "suspicious_form",
      "url": "https://malicious.com/steal"
    },
    {
      "type": "suspicious_link",
      "url": "https://phishing.site"
    }
  ],
  "recommendations": [
    "Do not enter sensitive information",
    "Report to Google Safe Browsing",
    "Consider clearing browser cache"
  ],
  "timestamp": 1707333600
}
```

**Status Codes:**
- 200: Success
- 400: Bad request
- 500: Server error

---

### 4. Analyze Form
**POST** `/api/analyze-form`

Analyze a specific form element for phishing.

**Request:**
```json
{
  "url": "https://example.com",
  "form_action": "https://evil.com/login",
  "form_method": "POST",
  "fields": ["email", "password"],
  "target_domain": "evil.com"
}
```

**Parameters:**
- `url` (string, required): Page URL containing form
- `form_action` (string, required): Form action URL
- `form_method` (string, required): POST or GET
- `fields` (array, required): Form field names
- `target_domain` (string, required): Domain form submits to

**Response:**
```json
{
  "risk_level": "critical",
  "confidence": 95,
  "reasoning": "Form collecting credentials submits to different domain",
  "action": "block",
  "details": {
    "form_action": "https://evil.com/login",
    "target_domain": "evil.com",
    "fields": ["email", "password"]
  },
  "timestamp": 1707333600
}
```

---

### 5. Analyze Email
**POST** `/api/analyze-email`

Analyze email content for phishing.

**Request:**
```json
{
  "sender": "noreply@bank.com",
  "subject": "Urgent: Verify your account",
  "body": "Please click here to verify...",
  "links": ["https://malicious.com/verify"]
}
```

**Parameters:**
- `sender` (string, required): Email sender address
- `subject` (string, required): Email subject
- `body` (string, required): Email body text
- `links` (array, optional): URLs found in email

**Response:**
```json
{
  "risk_level": "high",
  "confidence": 80,
  "reasoning": "Urgent language with suspicious links",
  "action": "warn",
  "details": {
    "suspicious_urgency": true,
    "suspicious_links": 1,
    "impersonation_likely": true
  },
  "timestamp": 1707333600
}
```

---

### 6. Status
**GET** `/status`

Get backend operational status.

**Response:**
```json
{
  "status": "operational",
  "timestamp": "2024-02-07T10:30:00Z",
  "llm_model": "mistralai/Mistral-7B-Instruct-v0.1"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message",
  "error_code": "INVALID_URL",
  "timestamp": 1707333600
}
```

**Common Error Codes:**
- `INVALID_URL`: URL format invalid
- `TIMEOUT`: LLM inference timeout
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `LLM_ERROR`: LLM inference failed
- `BACKEND_ERROR`: Server error

---

## Risk Level Reference

| Level | Description | Action |
|-------|-------------|--------|
| **safe** | No phishing indicators | Safe to proceed |
| **low** | Minor suspicious patterns | User notification |
| **medium** | Multiple indicators | Warning banner |
| **high** | Strong phishing signals | User warning + whitelist option |
| **critical** | High confidence phishing | Block or strong warning |

---

## Confidence Score

- **0-30**: Low confidence (ambiguous)
- **31-60**: Medium confidence (some indicators)
- **61-85**: High confidence (strong indicators)
- **86-100**: Critical confidence (definite phishing)

---

## Response Time

- First request: 2-5 seconds (model loading)
- Cached responses: <100 ms
- Subsequent requests: 1-2 seconds

---

## Usage Examples

### Python
```python
import requests

url = "http://localhost:8000/api/analyze-url"
payload = {
    "url": "https://suspicious.site",
    "page_content": "Log in to verify account"
}

response = requests.post(url, json=payload)
result = response.json()

if result['risk_level'] == 'high':
    print(f"⚠️ Warning: {result['reasoning']}")
```

### JavaScript
```javascript
const response = await fetch('http://localhost:8000/api/analyze-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://suspicious.site',
    page_content: 'Log in to verify'
  })
});

const result = await response.json();
console.log(`Risk: ${result.risk_level}, Confidence: ${result.confidence}%`);
```

### cURL
```bash
curl -X POST http://localhost:8000/api/analyze-url \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://example.com",
    "local_detections": []
  }' | jq
```

---

## Caching

Results are cached for 24 hours. To bypass cache, add a timestamp parameter:
```json
{
  "url": "https://example.com",
  "timestamp": 1707333600
}
```

---

## Rate Limiting

Headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1707420000
```

---

## Changelog

### v1.0.0 (2024-02-07)
- Initial release
- Core endpoints implemented
- Mistral-7B LLM integration

---

For more details, see [SETUP.md](SETUP.md) and [LLM_INTEGRATION.md](LLM_INTEGRATION.md)

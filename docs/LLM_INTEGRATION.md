# LLM Integration Guide

## Overview
istopphish uses **Mistral-7B-Instruct** via Hugging Face Inference API for intelligent phishing detection.

## Why Mistral-7B-Instruct?

| Feature | Mistral-7B | GPT-4 | Local ONNX |
|---------|-----------|-------|-----------|
| **Response Time** | 1-2 sec | 3-5 sec | <500 ms |
| **Cost** | Free tier + cheap | $0.03/call | Free |
| **Accuracy** | High (7B params) | Highest | Medium |
| **Setup** | 5 minutes | API key | Complex |
| **Privacy** | Cloud (logged) | Cloud (logged) | Local |
| **Scalability** | Good | Excellent | Limited |

**Best for MVP**: Mistral-7B via Hugging Face (free, fast, good accuracy)

## Setup

### 1. Get Hugging Face API Key

1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Name: "istopphish"
4. Type: "Read"
5. Click "Create token"
6. Copy token (starts with `hf_`)

### 2. Configure Backend

**File: `.env`**
```env
HUGGINGFACE_API_KEY=hf_your_token_here
LLM_MODEL=mistralai/Mistral-7B-Instruct-v0.1
LLM_TIMEOUT_SECONDS=10
```

### 3. Test Connection

```bash
# Start backend
python backend/main.py

# Test in another terminal
curl http://localhost:8000/health
# Should show: "llm_available": true
```

## How It Works

### Flow Diagram
```
┌─────────────────────────┐
│   Browser Extension     │
│  (Client-side detection)│
└────────────┬────────────┘
             │ Suspicious content found
             ▼
┌─────────────────────────┐
│    FastAPI Backend      │
│  (Orchestration layer)  │
└────────────┬────────────┘
             │ Build prompt with context
             ▼
┌─────────────────────────┐
│  Hugging Face API       │
│  (Mistral-7B-Instruct)  │
└────────────┬────────────┘
             │ LLM inference
             ▼
┌─────────────────────────┐
│   JSON Response         │
│ {risk_level, confidence}│
└─────────────────────────┘
```

## Prompt Engineering

### URL Analysis Prompt

```
You are a phishing detection expert. Analyze this URL for phishing risk.

URL: https://paypal-verify.com
Page Contains: "Verify your PayPal account immediately"

Risk Factors:
- Domain typosquatting (paypal → paypal-verify)
- Urgency language
- External redirect attempt

Respond with JSON:
{
    "risk_level": "critical",
    "confidence": 95,
    "reasoning": "Clear typosquatting with urgency tactics",
    "indicators": ["typosquatting", "urgency", "credential_theft"]
}
```

### Page Analysis Prompt

```
Analyze this webpage for phishing. Check:
1. Domain reputation
2. Credential harvesting
3. Urgency/fear tactics
4. Brand impersonation

[Page content...]

Return JSON with overall_risk and recommendations.
```

### Email Analysis Prompt

```
Check this email for phishing:
- Sender spoofing
- Malicious links
- Social engineering
- Grammar issues

From: noreply@bank.com
Subject: Urgent: Verify Account
Body: [email text]

Risk assessment required.
```

## Available Models

### Recommended
- **mistralai/Mistral-7B-Instruct-v0.1** (Current)
  - Speed: 1-2 sec
  - Quality: High
  - Free tier: Yes

### Alternatives

**Llama Models**
```env
LLM_MODEL=meta-llama/Llama-2-7b-chat-hf
# Speed: 2-3 sec
# Quality: Very High
# Note: Larger, slower
```

**Lightweight**
```env
LLM_MODEL=gpt2
# Speed: <500 ms
# Quality: Medium
# Use for testing only
```

## Customizing Prompts

**File: `backend/utils/prompts.py`**

```python
class PhishingPrompts:
    def url_analysis_prompt(self, url, page_content, detections):
        # Customize this prompt
        return f"""You are a phishing expert.
        
        Analyze: {url}
        
        Check for:
        1. Domain typosquatting
        2. Suspicious redirects
        3. Credential harvesting
        
        Respond with JSON format...
        """
```

## Performance Tuning

### Response Time Issues

**Problem**: First request takes 5+ seconds
**Solution**: This is normal. Model loads on first inference.

**Problem**: All requests are slow
**Solution**: 
```env
# Reduce LLM timeout
LLM_TIMEOUT_SECONDS=8

# Or use faster model
LLM_MODEL=gpt2
```

### Cost Optimization

**For free tier:**
```env
# Cache enabled by default
# Results cached 24 hours
CACHE_TTL_HOURS=24

# Batch requests
# Don't re-analyze same URL within cache TTL
```

**For paid tier:**
```env
# Hugging Face Pro: $9/month
# Inference Endpoints: Better performance
# Use dedicated endpoint instead of API
```

## Error Handling

### LLM Timeout
```python
# backend/services/llm_service.py
try:
    result = await llm.analyze_text(prompt)
except asyncio.TimeoutError:
    # Fallback to heuristics only
    return heuristic_result
```

### Invalid Response
```python
# Check response is valid JSON
def _parse_llm_response(self, response):
    try:
        # Extract JSON from response
        json_str = response.get("generated_text", "")
        return json.loads(json_str)
    except json.JSONDecodeError:
        return {"error": "Invalid LLM response"}
```

### API Rate Limiting
```python
# Hugging Face limits: 500 calls/hour free tier
# Implement caching and request deduplication
await cache_analysis(url, result)
```

## Advanced: Local LLM Deployment

### Option 1: ONNX Runtime (Fastest)
```bash
pip install onnx onnxruntime

# Download model
# Use mistral.onnx or quantized version

# In code:
import onnxruntime as rt
session = rt.InferenceSession("mistral.onnx")
```

**Pros**: Fast (<500ms), offline, free
**Cons**: Setup complex, uses CPU

### Option 2: llama.cpp
```bash
# Compile llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make

# Convert Mistral to GGML format
python convert.py mistral-7b

# Run
./main -m mistral.ggml
```

**Pros**: Fast, simple
**Cons**: Requires compilation

### Option 3: Ollama
```bash
# Install Ollama (https://ollama.ai)
# Pull model
ollama pull mistral

# Run
ollama serve

# Use in FastAPI
import requests
response = requests.post('http://localhost:11434/api/generate', json={
    'model': 'mistral',
    'prompt': '...'
})
```

**Pros**: Easiest local option
**Cons**: Separate service to manage

## Monitoring & Logging

### Check LLM Performance
```python
from utils.logger import logApiCall

# In analysis
start = time.time()
result = await llm.analyze_text(prompt)
duration = time.time() - start

logApiCall('/hf-inference', 'POST', 200, duration)
```

### View Logs
```bash
tail -f istopphish.log
```

### Monitor Rate Limit Usage
```python
# Hugging Face shows usage in dashboard
# Free tier: 500 calls/hour
# Check at: https://huggingface.co/settings/billing/overview
```

## Troubleshooting

### "Invalid API Token"
- Verify token in `.env`
- Token must have "read" permission
- Generate new token if expired

### "Model Not Found"
- Check model name in `.env`
- Must be exact: `mistralai/Mistral-7B-Instruct-v0.1`
- Visit https://huggingface.co/models to verify

### "Timeout"
- First request always slower (model loading)
- Increase `LLM_TIMEOUT_SECONDS` if needed
- Check network connection

### "Rate Limited"
- Free tier: 500 calls/hour
- Wait for hour to reset
- Consider upgrading to Pro

### "JSON Parse Error"
- LLM response not valid JSON
- Check prompt format
- Verify LLM model can follow instructions
- Add error handling in `_parse_llm_response()`

## Advanced Tuning

### Prompt Optimization
```python
# Reduce prompt length for faster inference
prompt = f"""Analyze {url} for phishing.
Risk factors: {minimal_context}
Response: {{"risk_level": "...", "confidence": ...}}"""
```

### Temperature Tuning
```python
# Lower = more deterministic (good for classification)
# Higher = more creative (bad for this task)
payload = {
    "temperature": 0.3,  # Conservative
    "top_p": 0.9
}
```

### Batch Processing
```python
# Analyze multiple URLs in one call
prompts = [
    build_prompt(url1),
    build_prompt(url2),
    build_prompt(url3)
]
# Use HF batch API (if available)
```

## Cost Analysis

### Hugging Face Inference API
- **Free Tier**: 
  - 500 calls/hour
  - Shared GPU
  - $0 cost
  
- **Pro Tier**: 
  - $9/month
  - Unlimited calls
  - Shared GPU

- **Inference Endpoints**: 
  - $0.06/hour (dedicated GPU)
  - For production

### Rough Monthly Cost (Free Tier)
- 500 calls/hour × 24 hours = 12,000 calls/day
- Average user: 10-50 analyses/day
- Free tier supports ~240-1200 users

## Next Steps

1. ✅ Set up Hugging Face API key
2. ✅ Configure `.env` with token
3. Test `/health` endpoint
4. Monitor first few days of usage
5. Consider optimization if needed

---

**Resources:**
- Hugging Face: https://huggingface.co
- Mistral Model: https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.1
- API Docs: https://huggingface.co/docs/api-inference

---

**For issues, see [SETUP.md](SETUP.md) troubleshooting or API.md**

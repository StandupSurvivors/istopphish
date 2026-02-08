"""
LLM Prompt templates for phishing detection
"""

from typing import List, Dict, Any

class PhishingPrompts:
    """Prompt templates for LLM"""
    
    def url_analysis_prompt(
        self,
        url: str,
        page_content: str,
        local_detections: List[Dict] = None
    ) -> str:
        """Build URL analysis prompt"""
        
        detections_str = ""
        if local_detections:
            detections_str = "\n\nLocal heuristic detections:\n"
            for det in local_detections:
                detections_str += f"- {det.get('type', '')}: {det.get('details', {})}\n"
        
        return f"""You are an expert phishing detection system. Analyze this URL and page content to classify the phishing risk.

URL: {url}

Page Content (first 500 chars):
{page_content[:500] if page_content else 'N/A'}
{detections_str}

Analyze for:
1. Domain reputation and typosquatting
2. SSL/HTTPS usage
3. Suspicious patterns in URL
4. Page content indicators (urgency, credential requests)
5. Mismatch between URL and content

Respond with JSON:
{{
    "risk_level": "safe|low|medium|high|critical",
    "confidence": 0-100,
    "reasoning": "brief explanation",
    "indicators": ["list of indicators"]
}}

Only respond with valid JSON."""
    
    def page_analysis_prompt(
        self,
        url: str,
        text_content: str,
        threats: List[Dict]
    ) -> str:
        """Build page analysis prompt"""
        
        threats_str = "\n".join([f"- {t.get('type')}: {t.get('url', t.get('action', ''))}" for t in threats])
        
        return f"""Analyze this webpage for phishing:

URL: {url}

Text Content:
{text_content[:1000]}

Detected Threats:
{threats_str or 'None'}

Check for:
- Credential harvesting attempts
- Urgency/fear tactics
- Brand impersonation
- Suspicious links or forms

Response format:
{{
    "overall_risk": "safe|low|medium|high|critical",
    "confidence": 0-100,
    "reasoning": "explanation",
    "recommendations": ["list of actions to take"]
}}"""
    
    def email_analysis_prompt(
        self,
        sender: str,
        subject: str,
        body: str,
        links: List[str]
    ) -> str:
        """Build email analysis prompt"""
        
        links_str = "\n".join(links) if links else "None"
        
        return f"""Analyze this email for phishing:

From: {sender}
Subject: {subject}

Body:
{body[:1000]}

Links:
{links_str}

Check for:
- Sender spoofing
- Urgency tactics
- Suspicious links
- Requests for sensitive info
- Grammar/formatting issues

Response:
{{
    "risk_level": "safe|low|medium|high|critical",
    "confidence": 0-100,
    "reasoning": "explanation",
    "suspicious_elements": ["list of suspicious parts"]
}}"""

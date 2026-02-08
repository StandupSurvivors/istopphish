"""
Pydantic request models
"""

from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any

class LocalDetection(BaseModel):
    """Local heuristic detection"""
    type: str  # suspicious_link, suspicious_form, etc.
    severity: str  # low, medium, high
    details: Dict[str, Any] = {}

class AnalyzeUrlRequest(BaseModel):
    """Analyze URL for phishing risk"""
    url: str
    page_content: Optional[str] = ""
    local_detections: Optional[List[LocalDetection]] = []
    user_context: Optional[Dict[str, Any]] = {}

class AnalyzePageRequest(BaseModel):
    """Analyze full page content"""
    url: str
    html_content: str
    timestamp: Optional[int] = None

class AnalyzeEmailRequest(BaseModel):
    """Analyze email content"""
    sender: str
    subject: str
    body: str
    links: Optional[List[str]] = []

class AnalyzeFormRequest(BaseModel):
    """Analyze form for phishing patterns"""
    url: str
    form_action: str
    form_method: str
    fields: List[str]
    target_domain: str

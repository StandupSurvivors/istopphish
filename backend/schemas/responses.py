"""
Pydantic response models
"""

from pydantic import BaseModel
from typing import Dict, Any, List
from enum import Enum

class RiskLevel(str, Enum):
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class UserAction(str, Enum):
    SAFE = "safe"
    VERIFY = "verify"
    WARN = "warn"
    BLOCK = "block"

class AnalysisResponse(BaseModel):
    """Generic analysis response"""
    risk_level: RiskLevel
    confidence: float  # 0-100
    reasoning: str
    action: UserAction
    details: Dict[str, Any] = {}
    timestamp: int

class UrlAnalysisResponse(AnalysisResponse):
    """URL analysis response"""
    url: str
    phishing_indicators: List[str] = []
    safe_alternatives: List[str] = []

class PageAnalysisResponse(BaseModel):
    """Full page analysis response"""
    url: str
    overall_risk: RiskLevel
    confidence: float
    detected_threats: List[Dict[str, Any]] = []
    recommendations: List[str] = []
    timestamp: int

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    llm_available: bool
    uptime_seconds: float

class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
    error_code: str
    timestamp: int

"""
Analysis router
Endpoints for phishing analysis
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
import time
from datetime import datetime
import logging
import json

from schemas.requests import (
    AnalyzeUrlRequest,
    AnalyzePageRequest,
    AnalyzeEmailRequest,
    AnalyzeFormRequest
)
from schemas.responses import (
    UrlAnalysisResponse,
    PageAnalysisResponse,
    RiskLevel,
    UserAction,
    AnalysisResponse
)
from services.llm_service import LLMService
from services.phishing_analyzer import PhishingAnalyzer
from utils.rate_limit import RateLimiter

router = APIRouter(prefix="/api", tags=["analysis"])
logger = logging.getLogger(__name__)
ai_logger = logging.getLogger('ai_analysis')

# Initialize services
llm_service = LLMService()
phishing_analyzer = PhishingAnalyzer(llm_service)
rate_limiter = RateLimiter(requests_per_hour=100)

@router.post("/analyze-url", response_model=UrlAnalysisResponse)
async def analyze_url(request: AnalyzeUrlRequest, background_tasks: BackgroundTasks):
    """
    Analyze URL for phishing risk
    Combines local heuristics with LLM-powered analysis
    """
    try:
        # Rate limiting
        if not rate_limiter.check_limit():
            raise HTTPException(status_code=429, detail="Rate limit exceeded")

        logger.info(f"Analyzing URL: {request.url}")

        # Run analysis
        result = await phishing_analyzer.analyze_url(
            url=request.url,
            page_content=request.page_content,
            local_detections=request.local_detections
        )

        # Log AI result to ai_analysis.log
        ai_logger.info(json.dumps({
            "type": "URL_ANALYSIS",
            "url": request.url,
            "result": result,
            "timestamp": datetime.now().isoformat()
        }, indent=2))

        # Log result
        background_tasks.add_task(
            logger.info,
            f"URL analysis complete: {request.url} - Risk: {result['risk_level']}"
        )

        return UrlAnalysisResponse(
            url=request.url,
            risk_level=result['risk_level'],
            confidence=result['confidence'],
            reasoning=result['reasoning'],
            action=result['action'],
            details=result.get('details', {}),
            phishing_indicators=result.get('phishing_indicators', []),
            timestamp=int(time.time())
        )

    except Exception as e:
        logger.error(f"Error analyzing URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-page", response_model=PageAnalysisResponse)
async def analyze_page(request: AnalyzePageRequest):
    """
    Analyze full page content
    """
    try:
        logger.info(f"Analyzing page: {request.url}")

        # Extract text and structure from HTML
        detected_threats = phishing_analyzer.extract_page_threats(request.html_content)

        # Analyze with LLM
        llm_analysis = await phishing_analyzer.analyze_page_content(
            url=request.url,
            html_content=request.html_content,
            threats=detected_threats
        )

        # Log AI result to ai_analysis.log
        ai_logger.info(json.dumps({
            "type": "PAGE_ANALYSIS",
            "url": request.url,
            "llm_analysis": llm_analysis,
            "detected_threats": detected_threats,
            "timestamp": datetime.now().isoformat()
        }, indent=2))

        # Check if LLM analysis failed
        if 'error' in llm_analysis:
            logger.error(f"LLM analysis failed: {llm_analysis['error']}")
            # Return safe default
            return PageAnalysisResponse(
                url=request.url,
                overall_risk="low",
                confidence=50,
                detected_threats=detected_threats,
                recommendations=["LLM analysis unavailable, using heuristic detection only"],
                timestamp=int(time.time())
            )

        return PageAnalysisResponse(
            url=request.url,
            overall_risk=llm_analysis.get('overall_risk', 'low'),
            confidence=llm_analysis.get('confidence', 50),
            detected_threats=detected_threats,
            recommendations=llm_analysis.get('recommendations', []),
            timestamp=int(time.time())
        )

    except Exception as e:
        logger.error(f"Error analyzing page: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-form", response_model=AnalysisResponse)
async def analyze_form(request: AnalyzeFormRequest):
    """
    Analyze form for phishing patterns
    """
    try:
        logger.info(f"Analyzing form: {request.url}")
# Log AI result to ai_analysis.log
        ai_logger.info(json.dumps({
            "type": "FORM_ANALYSIS",
            "url": request.url,
            "result": result,
            "timestamp": datetime.now().isoformat()
        }, indent=2))

        
        result = await phishing_analyzer.analyze_form(
            url=request.url,
            form_action=request.form_action,
            form_method=request.form_method,
            fields=request.fields,
            target_domain=request.target_domain
        )

        return AnalysisResponse(
            risk_level=result['risk_level'],
            confidence=result['confidence'],
            reasoning=result['reasoning'],
            action=result['action'],
            details=result.get('details', {}),
            timestamp=int(time.time())
        )

    except Exception as e:
        logger.error(f"Error analyzing form: {str(e)}")
        # Log AI result to ai_analysis.log
        ai_logger.info(json.dumps({
            "type": "EMAIL_ANALYSIS",
            "sender": request.sender,
            "result": result,
            "timestamp": datetime.now().isoformat()
        }, indent=2))

        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-email", response_model=AnalysisResponse)
async def analyze_email(request: AnalyzeEmailRequest):
    """
    Analyze email content for phishing
    """
    try:
        logger.info(f"Analyzing email from: {request.sender}")

        result = await phishing_analyzer.analyze_email(
            sender=request.sender,
            subject=request.subject,
            body=request.body,
            links=request.links
        )

        return AnalysisResponse(
            risk_level=result['risk_level'],
            confidence=result['confidence'],
            reasoning=result['reasoning'],
            action=result['action'],
            details=result.get('details', {}),
            timestamp=int(time.time())
        )

    except Exception as e:
        logger.error(f"Error analyzing email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analyze-url/{url:path}")
async def get_url_analysis(url: str):
    """
    Quick GET endpoint for URL checking
    """
    request = AnalyzeUrlRequest(url=url)
    background_tasks = BackgroundTasks()
    return await analyze_url(request, background_tasks)

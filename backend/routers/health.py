"""
Health check router
"""

from fastapi import APIRouter
import time
from datetime import datetime
from schemas.responses import HealthResponse

router = APIRouter(tags=["health"])

start_time = time.time()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        llm_available=True,
        uptime_seconds=time.time() - start_time
    )

@router.get("/status")
async def status():
    """Status endpoint"""
    return {
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "llm_model": "mistralai/Mistral-7B-Instruct-v0.1"
    }

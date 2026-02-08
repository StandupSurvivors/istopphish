"""
Backend Configuration
"""

import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API Keys
    HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
    
    # Server
    BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8000))
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,chrome-extension://*")
    
    # Rate Limiting
    RATE_LIMIT_PER_HOUR = int(os.getenv("RATE_LIMIT_PER_HOUR", 100))
    
    # Cache
    CACHE_TTL_HOURS = int(os.getenv("CACHE_TTL_HOURS", 24))
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    
    # LLM Configuration - Using Mistral-7B which is stable on Hugging Face Inference API
    LLM_MODEL = os.getenv("LLM_MODEL", "mistralai/Mistral-7B-Instruct-v0.1")
    LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", 20))
    
    # Analysis Thresholds
    AUTO_BLOCK_CONFIDENCE = int(os.getenv("AUTO_BLOCK_CONFIDENCE", 85))
    WARN_CONFIDENCE = int(os.getenv("WARN_CONFIDENCE", 50))

settings = Settings()

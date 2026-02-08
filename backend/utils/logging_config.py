"""
Logging configuration
"""

import logging
import json
from datetime import datetime
from config import settings

def setup_logging():
    """Setup logging configuration"""
    
    log_level = getattr(logging, settings.LOG_LEVEL, logging.INFO)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(detailed_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler for general logs
    file_handler = logging.FileHandler('istopphish.log')
    file_handler.setLevel(log_level)
    file_handler.setFormatter(detailed_formatter)
    root_logger.addHandler(file_handler)
    
    # File handler for AI analysis logs (JSON format)
    ai_handler = logging.FileHandler('ai_analysis.log')
    ai_handler.setLevel(logging.INFO)
    ai_formatter = logging.Formatter('%(asctime)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    ai_handler.setFormatter(ai_formatter)
    
    # Create AI logger
    ai_logger = logging.getLogger('ai_analysis')
    ai_logger.addHandler(ai_handler)
    ai_logger.setLevel(logging.INFO)
    
    # Set level for FastAPI and uvicorn
    logging.getLogger("fastapi").setLevel(log_level)
    logging.getLogger("uvicorn").setLevel(log_level)

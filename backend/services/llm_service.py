"""
LLM Service using Hugging Face Inference API (OpenAI-compatible)
"""

import logging
import json
import re
from typing import Dict, Any
from openai import OpenAI
from config import settings
from datetime import datetime

logger = logging.getLogger(__name__)
ai_logger = logging.getLogger('ai_analysis')

class LLMService:
    """Service for LLM inference via Hugging Face API"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.HUGGINGFACE_API_KEY
        self.base_url = "https://router.huggingface.co/v1"
        self.model = settings.LLM_MODEL
        self.timeout = settings.LLM_TIMEOUT_SECONDS
        
        self.client = OpenAI(
            base_url=self.base_url,
            api_key=self.api_key
        )
        
        if not self.api_key:
            logger.warning("No Hugging Face API key configured")
    
    async def analyze_text(self, text: str, task: str = "classification") -> Dict[str, Any]:
        """
        Analyze text for phishing using LLM
        
        Args:
            text: Text to analyze
            task: Task type (classification, question_answering, etc.)
            
        Returns:
            Analysis result from LLM
        """
        max_retries = 2
        for attempt in range(max_retries):
            try:
                prompt = self._build_phishing_prompt(text)
                
                completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.1,
                    max_tokens=300,
                    top_p=0.9,
                    timeout=self.timeout
                )
                
                response_text = completion.choices[0].message.content
                
                # Log raw LLM response
                ai_logger.info(json.dumps({
                    "type": "LLM_RAW_RESPONSE",
                    "model": self.model,
                    "raw_response": response_text,
                    "timestamp": datetime.now().isoformat()
                }, indent=2))
                
                parsed_result = self._parse_llm_response(response_text)
                
                # Log parsed response
                ai_logger.info(json.dumps({
                    "type": "LLM_PARSED_RESPONSE",
                    "model": self.model,
                    "parsed_result": parsed_result,
                    "timestamp": datetime.now().isoformat()
                }, indent=2))
                
                return parsed_result
            
            except Exception as e:
                error_str = str(e)
                logger.error(f"LLM request failed (attempt {attempt + 1}/{max_retries}): {error_str}")
                
                if attempt < max_retries - 1:
                    if "503" in error_str or "loading" in error_str.lower():
                        logger.warning("Model loading, retrying...")
                        import asyncio
                        await asyncio.sleep(2)
                        continue
                    else:
                        import asyncio
                        await asyncio.sleep(1)
                        continue
                
                return {"error": f"LLM analysis failed: {error_str}"}
    
    def _build_phishing_prompt(self, text: str) -> str:
        """Build prompt for phishing detection"""
        return f"""You are an expert cybersecurity analyst specializing in phishing detection. Analyze the following content for phishing indicators.

Content to analyze:
{text}

Respond ONLY with valid JSON in this exact format:
{{
    "risk_level": "safe|low|medium|high|critical",
    "confidence": 0-100,
    "reasoning": "brief explanation of why this is safe or dangerous",
    "indicators": ["list of specific phishing indicators found"]
}}"""
    
    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response"""
        try:
            # Extract JSON from response text
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return result
            
            return {"error": "Could not parse LLM response"}
        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
            return {"error": str(e)}

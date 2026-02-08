"""
LLM Service using Hugging Face Inference API
"""

import aiohttp
import asyncio
import logging
import json
from typing import Dict, Any
from config import settings
from datetime import datetime

logger = logging.getLogger(__name__)
ai_logger = logging.getLogger('ai_analysis')

class LLMService:
    """Service for LLM inference via Hugging Face API"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or settings.HUGGINGFACE_API_KEY
        self.base_url = "https://router.huggingface.co/models"
        self.model = settings.LLM_MODEL
        self.timeout = settings.LLM_TIMEOUT_SECONDS
        
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
                
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "inputs": prompt,
                    "parameters": {
                        "max_new_tokens": 300,
                        "temperature": 0.1,
                        "top_p": 0.9
                    }
                }
                
                async with aiohttp.ClientSession() as session:
                    url = f"{self.base_url}/{self.model}"
                    async with session.post(
                        url,
                        json=payload,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=self.timeout)
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            
                            # Log raw LLM response
                            ai_logger.info(json.dumps({
                                "type": "LLM_RAW_RESPONSE",
                                "model": self.model,
                                "raw_response": result,
                                "timestamp": datetime.now().isoformat()
                            }, indent=2))
                            
                            parsed_result = self._parse_llm_response(result)
                            
                            # Log parsed response
                            ai_logger.info(json.dumps({
                                "type": "LLM_PARSED_RESPONSE",
                                "model": self.model,
                                "parsed_result": parsed_result,
                                "timestamp": datetime.now().isoformat()
                            }, indent=2))
                            
                            return parsed_result
                        elif response.status == 503 and attempt < max_retries - 1:
                            # Model is loading, retry
                            logger.warning(f"Model loading (503), retrying... (attempt {attempt + 1}/{max_retries})")
                            await asyncio.sleep(2)
                            continue
                        else:
                            error_text = await response.text()
                            logger.error(f"LLM API error: {response.status} - {error_text}")
                            return {"error": f"LLM analysis failed: {response.status}"}
            
            except aiohttp.ClientError as e:
                logger.error(f"LLM request failed: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)
                    continue
                return {"error": str(e)}
            except Exception as e:
                logger.error(f"Unexpected error in LLM analysis: {str(e)}")
                return {"error": str(e)}
        
        return {"error": "LLM analysis failed after retries"}
    
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
    
    def _parse_llm_response(self, response: Any) -> Dict[str, Any]:
        """Parse LLM response"""
        try:
            if isinstance(response, list) and len(response) > 0:
                text = response[0].get("generated_text", "")
            else:
                text = response.get("generated_text", "")
            
            # Extract JSON from response
            import json
            import re
            
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return result
            
            return {"error": "Could not parse LLM response"}
        except Exception as e:
            logger.error(f"Error parsing LLM response: {str(e)}")
            return {"error": str(e)}

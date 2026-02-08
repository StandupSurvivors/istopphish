"""
Phishing Analyzer Service
Combines heuristics and LLM analysis
"""

import re
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from .llm_service import LLMService
from utils.prompts import PhishingPrompts

logger = logging.getLogger(__name__)

class PhishingAnalyzer:
    """Core phishing detection logic"""
    
    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
        self.prompts = PhishingPrompts()
        
        # Known phishing indicators
        self.known_phishing_domains = []  # Could load from database
    
    async def analyze_url(
        self,
        url: str,
        page_content: str = "",
        local_detections: List[Dict] = None
    ) -> Dict[str, Any]:
        """Analyze URL for phishing risk"""
        
        logger.info(f"🔍 Starting URL analysis: {url}")
        
        # Run heuristics
        heuristic_result = self._heuristic_url_check(url)
        logger.info(f"✓ Heuristic check complete: {heuristic_result['risk_level']} ({heuristic_result['confidence']}%)")
        
        # Always use LLM for additional analysis
        logger.info(f"🤖 Calling LLM for analysis...")
        llm_prompt = self.prompts.url_analysis_prompt(url, page_content, local_detections)
        llm_result = await self.llm.analyze_text(llm_prompt)
        logger.info(f"✓ LLM response received: {llm_result.get('risk_level', 'ERROR')}")
        
        # Combine results
        final_result = self._combine_results(heuristic_result, llm_result)
        logger.info(f"📊 Final analysis result: {final_result['risk_level']} ({final_result['confidence']}%)")
        
        return final_result
    
    def _heuristic_url_check(self, url: str) -> Dict[str, Any]:
        """Heuristic-based URL checks"""
        risk_factors = []
        confidence = 0
        
        try:
            parsed = urlparse(url)
            domain = parsed.netloc
            
            # Check for suspicious patterns
            if self._is_suspicious_domain(domain):
                risk_factors.append("Suspicious domain pattern")
                confidence += 30
            
            if self._uses_ip_address(domain):
                risk_factors.append("Using IP address instead of domain")
                confidence += 25
            
            if not url.startswith('https'):
                risk_factors.append("Not using HTTPS")
                confidence += 20
            
            if self._has_suspicious_path(parsed.path):
                risk_factors.append("Suspicious URL path")
                confidence += 15
            
            if self._has_typosquatting_pattern(domain):
                risk_factors.append("Possible typosquatting")
                confidence += 25
            
            # Determine risk level based on confidence
            if confidence >= 80:
                risk_level = "critical"
            elif confidence >= 60:
                risk_level = "high"
            elif confidence >= 40:
                risk_level = "medium"
            elif confidence >= 20:
                risk_level = "low"
            else:
                risk_level = "safe"
            
            return {
                'risk_level': risk_level,
                'confidence': min(confidence, 100),
                'reasoning': '; '.join(risk_factors) or 'No suspicious patterns detected',
                'action': 'block' if confidence >= 85 else ('warn' if confidence >= 50 else 'safe'),
                'phishing_indicators': risk_factors
            }
        except Exception as e:
            logger.error(f"Error in heuristic URL check: {str(e)}")
            return {
                'risk_level': 'unknown',
                'confidence': 0,
                'reasoning': 'Analysis failed',
                'action': 'warn',
                'phishing_indicators': []
            }
    
    def _is_suspicious_domain(self, domain: str) -> bool:
        """Check for suspicious domain patterns"""
        # Suspicious patterns
        patterns = [
            r'-secure-',
            r'-verify-',
            r'-confirm-',
            r'-update-',
            r'-login-',
            r'paypal',  # Common impersonation
            r'amazon',
            r'apple',
            r'google',
        ]
        
        return any(re.search(pattern, domain, re.IGNORECASE) for pattern in patterns)
    
    def _uses_ip_address(self, domain: str) -> bool:
        """Check if domain uses IP address"""
        ip_pattern = r'^\d+\.\d+\.\d+\.\d+$'
        return bool(re.match(ip_pattern, domain))
    
    def _has_suspicious_path(self, path: str) -> bool:
        """Check for suspicious URL path patterns"""
        patterns = [r'verify', r'confirm', r'validate', r'update', r'secure']
        return any(re.search(pattern, path, re.IGNORECASE) for pattern in patterns)
    
    def _has_typosquatting_pattern(self, domain: str) -> bool:
        """Detect common typosquatting patterns"""
        # Known legitimate domains to compare against
        legitimate = ['google.com', 'facebook.com', 'amazon.com', 'paypal.com']
        
        for legit in legitimate:
            # Check for character substitution or insertion
            if self._is_similar(domain.split('.')[0], legit.split('.')[0]):
                return True
        
        return False
    
    def _is_similar(self, str1: str, str2: str) -> bool:
        """Check if strings are similar (Levenshtein-like)"""
        if abs(len(str1) - len(str2)) > 2:
            return False
        
        # Simple character-by-character comparison
        matches = sum(c1 == c2 for c1, c2 in zip(str1, str2))
        similarity = matches / max(len(str1), len(str2))
        return similarity > 0.7  # 70% similarity
    
    async def analyze_page_content(
        self,
        url: str,
        html_content: str,
        threats: List[Dict]
    ) -> Dict[str, Any]:
        """Analyze full page content"""
        
        # Extract key information
        text_content = self._extract_text(html_content)
        
        # Build LLM prompt
        prompt = self.prompts.page_analysis_prompt(url, text_content, threats)
        
        # Get LLM analysis
        result = await self.llm.analyze_text(prompt)
        
        return result
    
    async def analyze_form(
        self,
        url: str,
        form_action: str,
        form_method: str,
        fields: List[str],
        target_domain: str
    ) -> Dict[str, Any]:
        """Analyze form for phishing"""
        
        # Heuristic checks
        risk_factors = []
        confidence = 0
        
        # Check if form submits to different domain
        if target_domain not in url:
            risk_factors.append("Form submits to different domain")
            confidence += 50
        
        # Check for sensitive fields
        if any(f in fields for f in ['password', 'ssn', 'credit_card']):
            risk_factors.append("Form collects sensitive information")
            confidence += 30
        
        risk_level = 'high' if confidence >= 50 else 'medium'
        
        return {
            'risk_level': risk_level,
            'confidence': min(confidence, 100),
            'reasoning': '; '.join(risk_factors),
            'action': 'block' if confidence >= 80 else 'warn',
            'details': {
                'form_action': form_action,
                'target_domain': target_domain,
                'fields': fields
            }
        }
    
    async def analyze_email(
        self,
        sender: str,
        subject: str,
        body: str,
        links: List[str]
    ) -> Dict[str, Any]:
        """Analyze email for phishing"""
        
        prompt = self.prompts.email_analysis_prompt(sender, subject, body, links)
        result = await self.llm.analyze_text(prompt)
        
        return result
    
    def extract_page_threats(self, html_content: str) -> List[Dict]:
        """Extract threats from HTML"""
        threats = []
        
        # Extract links
        link_pattern = r'href=["\']([^"\']+)["\']'
        for match in re.finditer(link_pattern, html_content):
            url = match.group(1)
            if self._is_suspicious_url(url):
                threats.append({
                    'type': 'suspicious_link',
                    'url': url
                })
        
        # Extract forms
        form_pattern = r'<form[^>]*action=["\']([^"\']+)["\']'
        for match in re.finditer(form_pattern, html_content):
            action = match.group(1)
            threats.append({
                'type': 'suspicious_form',
                'action': action
            })
        
        return threats
    
    def _is_suspicious_url(self, url: str) -> bool:
        """Check if URL looks suspicious"""
        if not url.startswith('http'):
            return False
        
        try:
            parsed = urlparse(url)
            return self._is_suspicious_domain(parsed.netloc)
        except:
            return False
    
    def _extract_text(self, html: str) -> str:
        """Extract text from HTML"""
        # Remove script and style
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
        
        # Remove HTML tags
        html = re.sub(r'<[^>]+>', '', html)
        
        # Clean up
        text = ' '.join(html.split())
        return text[:5000]  # First 5000 chars
    
    def _combine_results(self, heuristic: Dict, llm: Dict) -> Dict:
        """Combine heuristic and LLM results"""
        
        # Weight: 40% heuristics, 60% LLM
        heur_confidence = heuristic.get('confidence', 0) * 0.4
        llm_confidence = llm.get('confidence', 0) * 0.6
        
        combined_confidence = heur_confidence + llm_confidence
        
        # Take more conservative (higher) risk level
        risk_levels = ['safe', 'low', 'medium', 'high', 'critical']
        heur_level = risk_levels.index(heuristic.get('risk_level', 'safe'))
        llm_level = risk_levels.index(llm.get('risk_level', 'safe'))
        
        final_level = risk_levels[max(heur_level, llm_level)]
        
        return {
            'risk_level': final_level,
            'confidence': min(combined_confidence, 100),
            'reasoning': f"Heuristic: {heuristic.get('reasoning', '')} | LLM: {llm.get('reasoning', '')}",
            'action': 'block' if combined_confidence >= 85 else ('warn' if combined_confidence >= 50 else 'safe'),
            'phishing_indicators': heuristic.get('phishing_indicators', []) + llm.get('indicators', [])
        }

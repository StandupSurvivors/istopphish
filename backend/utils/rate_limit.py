"""
Rate limiting utility
"""

import time
from collections import defaultdict
from config import settings

class RateLimiter:
    """Simple rate limiter"""
    
    def __init__(self, requests_per_hour: int = None):
        self.requests_per_hour = requests_per_hour or settings.RATE_LIMIT_PER_HOUR
        self.requests = defaultdict(list)
    
    def check_limit(self, identifier: str = "default") -> bool:
        """Check if request is within rate limit"""
        now = time.time()
        hour_ago = now - 3600
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > hour_ago
        ]
        
        if len(self.requests[identifier]) >= self.requests_per_hour:
            return False
        
        self.requests[identifier].append(now)
        return True

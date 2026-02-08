/**
 * Logging utility for debugging and monitoring
 */

export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

const DEFAULT_LEVEL = LogLevel.INFO;

/**
 * Log message with timestamp
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} data - Additional data
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const prefix = `[istopphish] [${timestamp}] [${level}]`;
  
  if (data && Object.keys(data).length > 0) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  debug: (message, data) => log(LogLevel.DEBUG, message, data),
  info: (message, data) => log(LogLevel.INFO, message, data),
  warn: (message, data) => log(LogLevel.WARN, message, data),
  error: (message, data) => log(LogLevel.ERROR, message, data)
};

/**
 * Log detection result
 * @param {object} detection - Detection data
 */
export function logDetection(detection) {
  logger.warn('Phishing detection', {
    type: detection.type,
    severity: detection.severity,
    confidence: detection.confidence,
    details: detection.details
  });
}

/**
 * Log API call
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {number} status - Response status
 * @param {number} duration - Duration in ms
 */
export function logApiCall(endpoint, method, status, duration) {
  const level = status >= 400 ? LogLevel.WARN : LogLevel.DEBUG;
  logger[level.toLowerCase()](`API ${method} ${endpoint}`, {
    status,
    duration_ms: duration
  });
}

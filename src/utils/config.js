/**
 * Extension configuration and constants
 */

import { getSettings } from './storage.js';

export const CONFIG = {
  // Backend API configuration
  BACKEND: {
    DEFAULT_URL: 'http://localhost:8000',
    ENDPOINTS: {
      ANALYZE_URL: '/api/analyze-url',
      ANALYZE_PAGE: '/api/analyze-page',
      ANALYZE_EMAIL: '/api/analyze-email',
      HEALTH: '/health'
    },
    TIMEOUT_MS: 5000,
    RETRY_ATTEMPTS: 2
  },

  // Phishing detection sensitivity levels
  SENSITIVITY: {
    LOW: 'low',        // Only report high confidence threats
    MEDIUM: 'medium',  // Report medium+ confidence threats
    HIGH: 'high'       // Report all potential threats
  },

  // Risk levels
  RISK_LEVEL: {
    SAFE: 'safe',
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },

  // Colors for risk levels
  COLORS: {
    safe: '#28a745',
    low: '#ffc107',
    medium: '#fd7e14',
    high: '#dc3545',
    critical: '#721c24'
  },

  // DOM highlighting
  DETECTION: {
    HIGHLIGHT_CLASS: 'istopphish-suspicious',
    WARNING_CLASS: 'istopphish-warning',
    HIGHLIGHT_COLOR: '#ff6b6b',
    ZINDEX: 999999
  },

  // Cache configuration
  CACHE: {
    TTL_HOURS: 24,
    MAX_ENTRIES: 1000
  },

  // Rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS_PER_HOUR: 100,
    WINDOW_MS: 60 * 60 * 1000
  },

  // Icons
  ICONS: {
    SAFE: 'data:image/svg+xml,...',
    WARNING: 'data:image/svg+xml,...',
    DANGER: 'data:image/svg+xml,...'
  },

  // Analysis thresholds
  THRESHOLDS: {
    // Confidence threshold for automatic blocking
    AUTO_BLOCK_CONFIDENCE: 85,
    // Confidence threshold for showing warning
    WARN_CONFIDENCE: 50
  }
};

/**
 * Get backend URL from settings
 * @returns {Promise<string>}
 */
export async function getBackendUrl() {
  const settings = await getSettings();
  return settings.backendUrl || CONFIG.BACKEND.DEFAULT_URL;
}

/**
 * Check if feature is enabled
 * @param {string} feature - Feature name
 * @returns {Promise<boolean>}
 */
export async function isFeatureEnabled(feature) {
  const settings = await getSettings();
  return settings[feature] !== false;
}


/**
 * Get user sensitivity level
 * @returns {Promise<string>}
 */
export async function getSensitivityLevel() {
  const settings = await getSettings();
  return settings.sensitivity || CONFIG.SENSITIVITY.MEDIUM;
}


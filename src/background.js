/**
 * Background Service Worker
 * Handles extension lifecycle, message routing, and backend communication
 */

import { onMessage, sendToContent } from './utils/messaging.js';
import {
  getSettings,
  updateSettings,
  cacheAnalysis,
  getCachedAnalysis,
  addToHistory,
  isWhitelisted,
  whitelistDomain
} from './utils/storage.js';
import { logger } from './utils/logger.js';
import { getBackendUrl, CONFIG } from './utils/config.js';

// Track analysis requests for rate limiting
const requestLog = {};

/**
 * Check rate limit
 * @param {string} identifier - User identifier (could be tabId)
 * @returns {boolean} - Whether request is allowed
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const window = CONFIG.RATE_LIMIT.WINDOW_MS;
  const max = CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_HOUR;

  if (!requestLog[identifier]) {
    requestLog[identifier] = [];
  }

  // Clean old entries
  requestLog[identifier] = requestLog[identifier].filter(time => now - time < window);

  if (requestLog[identifier].length >= max) {
    return false;
  }

  requestLog[identifier].push(now);
  return true;
}

/**
 * Analyze URL with backend LLM
 * @param {string} url - URL to analyze
 * @param {object} context - Additional context
 * @returns {Promise<object>} - Analysis result
 */
async function analyzeUrl(url, context = {}) {
  try {
    // Check cache first
    const cached = await getCachedAnalysis(url);
    if (cached) {
      logger.debug('Using cached analysis for', { url });
      return cached;
    }

    const backendUrl = await getBackendUrl();
    const endpoint = `${backendUrl}${CONFIG.BACKEND.ENDPOINTS.ANALYZE_URL}`;

    const response = await Promise.race([
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          page_content: context.pageContent || '',
          local_detections: context.localDetections || [],
          user_context: context.userContext || {}
        })
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Backend timeout')), CONFIG.BACKEND.TIMEOUT_MS)
      )
    ]);

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();

    // Cache the result
    await cacheAnalysis(url, result);

    logger.info('URL analyzed successfully', { url, riskLevel: result.risk_level });
    return result;
  } catch (error) {
    logger.error('Failed to analyze URL', { url, error: error.message });
    // Return safe default on error
    return {
      risk_level: 'unknown',
      confidence: 0,
      reasoning: 'Could not reach backend. Using local detection only.',
      action: 'warn'
    };
  }
}

/**
 * Analyze page content
 * @param {string} pageHtml - HTML content
 * @param {string} url - Page URL
 * @returns {Promise<object>} - Analysis result
 */
async function analyzePage(pageHtml, url) {
  try {
    const backendUrl = await getBackendUrl();
    const endpoint = `${backendUrl}${CONFIG.BACKEND.ENDPOINTS.ANALYZE_PAGE}`;

    const response = await Promise.race([
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          html_content: pageHtml,
          timestamp: Date.now()
        })
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Backend timeout')), CONFIG.BACKEND.TIMEOUT_MS)
      )
    ]);

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Failed to analyze page', { url, error: error.message });
    return { risk_level: 'unknown', detections: [] };
  }
}

// Listen for messages from content scripts and popup
onMessage(async (message, sender, sendResponse) => {
  logger.debug('Message received', { action: message.action, from: sender });

  try {
    switch (message.action) {
      case 'ANALYZE_URL': {
        if (!checkRateLimit(sender.tabId)) {
          sendResponse({
            success: false,
            error: 'Rate limit exceeded'
          });
          break;
        }
        const result = await analyzeUrl(message.url, message.context);
        sendResponse({
          success: true,
          data: result
        });
        break;
      }

      case 'ANALYZE_PAGE': {
        const result = await analyzePage(message.pageHtml, message.url);
        await addToHistory({
          type: 'page_analysis',
          url: message.url,
          result,
          tabId: sender.tabId
        });
        sendResponse({
          success: true,
          data: result
        });
        break;
      }

      case 'GET_DETECTION': {
        const detection = message.detection;
        await addToHistory({
          type: detection.type,
          severity: detection.severity,
          url: sender.url,
          tabId: sender.tabId
        });
        sendResponse({ success: true });
        break;
      }

      case 'WHITELIST_DOMAIN': {
        await whitelistDomain(message.domain);
        // Notify content script to update
        await sendToContent(sender.tabId, 'DOMAIN_WHITELISTED', {
          domain: message.domain
        });
        sendResponse({ success: true });
        break;
      }

      case 'CHECK_WHITELIST': {
        const whitelisted = await isWhitelisted(message.domain);
        sendResponse({
          success: true,
          whitelisted
        });
        break;
      }

      case 'GET_SETTINGS': {
        const settings = await getSettings();
        sendResponse({
          success: true,
          data: settings
        });
        break;
      }

      case 'UPDATE_SETTINGS': {
        await updateSettings(message.settings);
        sendResponse({ success: true });
        break;
      }

      case 'HEALTH_CHECK': {
        const backendUrl = await getBackendUrl();
        try {
          const response = await fetch(`${backendUrl}${CONFIG.BACKEND.ENDPOINTS.HEALTH}`);
          sendResponse({
            success: response.ok,
            backendHealthy: response.ok
          });
        } catch {
          sendResponse({
            success: true,
            backendHealthy: false
          });
        }
        break;
      }

      case 'CHECK_STATUS': {
        const settings = await getSettings();
        const domain = new URL(message.currentUrl).hostname;
        const whitelisted = await isWhitelisted(domain);
        sendResponse({
          success: true,
          enabled: settings.enabled !== false,
          whitelisted,
          domain
        });
        break;
      }

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    logger.error('Error handling message', { action: message.action, error: error.message });
    sendResponse({
      success: false,
      error: error.message
    });
  }
});

// Extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logger.info('Extension installed');
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    logger.info('Extension updated');
  }
});

// Monitor active tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  logger.debug('Tab activated', { tabId: activeInfo.tabId });
});

logger.info('Background service worker initialized');

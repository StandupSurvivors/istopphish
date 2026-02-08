/**
 * Enhanced Content Script
 * Detects phishing elements and communicates with background script
 * Simple implementation - no module imports (content scripts have limitations)
 */

let detectedThreats = [];

// Helper: Send message to background script
function sendToBackground(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Helper: Log to console
const logger = {
  info: (msg, data) => console.log(`[istopphish] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[istopphish] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[istopphish] ${msg}`, data || ''),
  debug: (msg, data) => console.debug(`[istopphish] ${msg}`, data || '')
};

/**
 * Detect phishing elements on page
 * @returns {object} Detection results
 */
function detectPhishyElements() {
  const phishyElements = {
    suspiciousLinks: [],
    suspiciousForms: [],
    suspiciousInputs: [],
    redirectLinks: [],
    total: 0
  };

  // Check for links with mismatched text and href
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    const text = link.textContent.trim();

    if (text && href && !href.includes(text.split(' ')[0]) && text.length > 0) {
      phishyElements.suspiciousLinks.push({
        text: text.substring(0, 50),
        href: href.substring(0, 100),
        element: link,
        severity: 'medium'
      });
    }

    // Check for links redirecting to external domains
    if (href && (href.startsWith('http') || href.startsWith('//'))) {
      try {
        const linkUrl = new URL(href, window.location.href);
        const currentDomain = new URL(window.location.href).hostname;

        if (!linkUrl.hostname.includes(currentDomain)) {
          phishyElements.redirectLinks.push({
            text: text.substring(0, 50),
            href: href.substring(0, 100),
            targetDomain: linkUrl.hostname,
            element: link,
            severity: 'low'
          });
        }
      } catch (e) {
        // Invalid URL
      }
    }
  });

  // Check for suspicious forms
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const action = form.getAttribute('action');
    const method = form.getAttribute('method');

    if (action && action.startsWith('http')) {
      try {
        const formUrl = new URL(action);
        const currentDomain = new URL(window.location.href).hostname;

        if (!formUrl.hostname.includes(currentDomain)) {
          const hasPasswordField = form.querySelector('input[type="password"]');
          const hasEmailField = form.querySelector('input[type="email"]');

          phishyElements.suspiciousForms.push({
            action: action.substring(0, 100),
            method: method || 'POST',
            targetDomain: formUrl.hostname,
            hasPasswordField: !!hasPasswordField,
            hasEmailField: !!hasEmailField,
            element: form,
            severity: hasPasswordField ? 'high' : 'medium'
          });
        }
      } catch (e) {
        // Invalid URL
      }
    }
  });

  // Check for password input fields outside of HTTPS or in unusual forms
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    const isHttps = window.location.protocol === 'https:';
    const form = input.closest('form');

    if (!isHttps || (form && !form.getAttribute('action'))) {
      phishyElements.suspiciousInputs.push({
        type: input.type,
        name: input.name || 'unnamed',
        isHttps: isHttps,
        formAction: form ? form.getAttribute('action') : 'inline form',
        element: input,
        severity: isHttps ? 'low' : 'high'
      });
    }
  });

  phishyElements.total = phishyElements.suspiciousLinks.length +
                         phishyElements.suspiciousForms.length +
                         phishyElements.suspiciousInputs.length +
                         phishyElements.redirectLinks.length;

  return phishyElements;
}

/**
 * Highlight suspicious elements on page
 * @param {object} phishyElements - Detected elements
 */
function highlightSuspiciousElements(phishyElements) {
  const highlightElement = (element, severity) => {
    if (!element) return;
    
    element.classList.add(CONFIG.DETECTION.HIGHLIGHT_CLASS);
    element.style.outline = `3px solid ${CONFIG.COLORS[severity] || CONFIG.DETECTION.HIGHLIGHT_COLOR}`;
    element.style.outlineOffset = '2px';
    
    // Add title with warning
    const title = element.getAttribute('title') || '';
    element.setAttribute('title', `⚠️ Potentially suspicious (${severity}) - ${title}`);
  };

  phishyElements.suspiciousLinks.forEach(link => {
    highlightElement(link.element, link.severity);
  });

  phishyElements.suspiciousForms.forEach(form => {
    highlightElement(form.element, form.severity);
  });

  phishyElements.suspiciousInputs.forEach(input => {
    highlightElement(input.element, input.severity);
  });

  phishyElements.redirectLinks.forEach(link => {
    highlightElement(link.element, 'low');
  });
}

/**
 * Create and show warning banner
 * @param {object} threat - Threat information
 */
function showWarningBanner(threat) {
  if (document.querySelector('.istopphish-banner')) return; // Only show once

  const banner = document.createElement('div');
  banner.className = 'istopphish-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    color: white;
    padding: 12px 20px;
    z-index: ${CONFIG.DETECTION.ZINDEX};
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  const message = document.createElement('span');
  message.innerHTML = `
    <strong>⚠️ istopphish Warning:</strong> This page contains ${threat.total} potentially suspicious element(s).
    <a href="#" style="color: white; text-decoration: underline; margin-left: 10px;">Learn more</a>
  `;
  message.style.flex = '1';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    background: rgba(255,255,255,0.3);
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 18px;
  `;
  closeBtn.onclick = () => banner.remove();

  banner.appendChild(message);
  banner.appendChild(closeBtn);
  document.body.insertBefore(banner, document.body.firstChild);
}

/**
 * Send detections to background script
 * @param {object} detections - All detected threats
 */
async function reportDetections(detections) {
  if (detections.total === 0) return;

  try {
    await sendToBackground('ANALYZE_PAGE', {
      url: window.location.href,
      pageHtml: document.documentElement.outerHTML.substring(0, 10000), // First 10KB
      detections
    });

    // Report to backend for LLM analysis
    await sendToBackground('ANALYZE_URL', {
      url: window.location.href,
      context: {
        localDetections: detections,
        pageContent: document.body.innerText.substring(0, 5000)
      }
    });
  } catch (error) {
    logger.error('Failed to report detections', { error: error.message });
  }
}

/**
 * Initialize content script
 */
async function initialize() {
  try {
    // Check if extension is enabled via background script
    const statusResponse = await sendToBackground('CHECK_STATUS', { currentUrl: window.location.href });
    
    if (!statusResponse.enabled) {
      logger.info('istopphish is disabled');
      return;
    }

    if (statusResponse.whitelisted) {
      logger.info('Domain is whitelisted', { domain: statusResponse.domain });
      return;
    }

    logger.info('Scanning page', { url: window.location.href });

    // Detect phishing elements
    const phishyElements = detectPhishyElements();

    if (phishyElements.total > 0) {
      logger.info(`Detected ${phishyElements.total} potential phishing indicators`);
      
      // Send to background for analysis
      await reportDetections(phishyElements);
    }
  } catch (error) {
    logger.error('Content script initialization error', { error: error.message });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

logger.debug('Content script loaded', { url: window.location.href });

/**
 * Message passing utilities for extension communication
 * Handles communication between content scripts, background, and popup
 */

/**
 * Send message to background service worker
 * @param {string} action - Action type
 * @param {object} data - Data payload
 * @returns {Promise} Response from background script
 */
export async function sendToBackground(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action, ...data },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}

/**
 * Send message to content script
 * @param {number} tabId - Tab ID
 * @param {string} action - Action type
 * @param {object} data - Data payload
 * @returns {Promise} Response from content script
 */
export async function sendToContent(tabId, action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { action, ...data },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      }
    );
  });
}

/**
 * Listen for messages
 * @param {function} callback - Callback to handle messages
 */
export function onMessage(callback) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    callback(message, sender, sendResponse);
    return true; // Keep channel open for async responses
  });
}

/**
 * Broadcast message to all tabs
 * @param {string} action - Action type
 * @param {object} data - Data payload
 */
export async function broadcastToAllTabs(action, data = {}) {
  const tabs = await chrome.tabs.query({});
  return Promise.all(
    tabs.map(tab => 
      sendToContent(tab.id, action, data).catch(() => null)
    )
  );
}

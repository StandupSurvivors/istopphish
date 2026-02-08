/**
 * Local storage abstraction for extension data
 */

export const StorageKey = {
  WHITELIST: 'whitelist_domains',
  BLOCKED: 'blocked_domains',
  ANALYSIS_CACHE: 'analysis_cache',
  SETTINGS: 'user_settings',
  DETECTION_HISTORY: 'detection_history',
  BACKEND_CONFIG: 'backend_config'
};

/**
 * Get data from storage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default if key not found
 * @returns {Promise} Stored value
 */
export async function getStorage(key, defaultValue = null) {
  const result = await chrome.storage.local.get(key);
  return result[key] !== undefined ? result[key] : defaultValue;
}

/**
 * Set data in storage
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 * @returns {Promise}
 */
export async function setStorage(key, value) {
  return chrome.storage.local.set({ [key]: value });
}

/**
 * Remove data from storage
 * @param {string} key - Storage key
 * @returns {Promise}
 */
export async function removeStorage(key) {
  return chrome.storage.local.remove(key);
}

/**
 * Get all storage data
 * @returns {Promise} All stored data
 */
export async function getAllStorage() {
  return chrome.storage.local.get(null);
}

/**
 * Check if domain is whitelisted
 * @param {string} domain - Domain to check
 * @returns {Promise<boolean>}
 */
export async function isWhitelisted(domain) {
  const whitelist = await getStorage(StorageKey.WHITELIST, []);
  return whitelist.includes(domain);
}

/**
 * Add domain to whitelist
 * @param {string} domain - Domain to whitelist
 * @returns {Promise}
 */
export async function whitelistDomain(domain) {
  const whitelist = await getStorage(StorageKey.WHITELIST, []);
  if (!whitelist.includes(domain)) {
    whitelist.push(domain);
    await setStorage(StorageKey.WHITELIST, whitelist);
  }
}

/**
 * Remove domain from whitelist
 * @param {string} domain - Domain to remove
 * @returns {Promise}
 */
export async function removeFromWhitelist(domain) {
  const whitelist = await getStorage(StorageKey.WHITELIST, []);
  const filtered = whitelist.filter(d => d !== domain);
  await setStorage(StorageKey.WHITELIST, filtered);
}

/**
 * Get user settings
 * @returns {Promise<object>}
 */
export async function getSettings() {
  return getStorage(StorageKey.SETTINGS, {
    enabled: true,
    highlightSuspicious: true,
    showWarnings: true,
    sensitivity: 'medium',
    backendUrl: 'http://localhost:8000',
    useLocalAnalysis: true,
    useLLMAnalysis: true
  });
}

/**
 * Update user settings
 * @param {object} updates - Settings to update
 * @returns {Promise}
 */
export async function updateSettings(updates) {
  const settings = await getSettings();
  const merged = { ...settings, ...updates };
  return setStorage(StorageKey.SETTINGS, merged);
}

/**
 * Get cached analysis result
 * @param {string} url - URL to check cache for
 * @returns {Promise<object|null>}
 */
export async function getCachedAnalysis(url) {
  const cache = await getStorage(StorageKey.ANALYSIS_CACHE, {});
  const entry = cache[url];
  
  if (!entry) return null;
  
  // Check if cache is still valid (24 hour TTL)
  const ageMs = Date.now() - entry.timestamp;
  const maxAgeMs = 24 * 60 * 60 * 1000;
  
  if (ageMs > maxAgeMs) {
    delete cache[url];
    await setStorage(StorageKey.ANALYSIS_CACHE, cache);
    return null;
  }
  
  return entry.result;
}

/**
 * Cache analysis result
 * @param {string} url - URL being analyzed
 * @param {object} result - Analysis result
 * @returns {Promise}
 */
export async function cacheAnalysis(url, result) {
  const cache = await getStorage(StorageKey.ANALYSIS_CACHE, {});
  cache[url] = {
    result,
    timestamp: Date.now()
  };
  return setStorage(StorageKey.ANALYSIS_CACHE, cache);
}

/**
 * Add to detection history
 * @param {object} detection - Detection data
 * @returns {Promise}
 */
export async function addToHistory(detection) {
  const history = await getStorage(StorageKey.DETECTION_HISTORY, []);
  history.unshift({
    ...detection,
    timestamp: Date.now()
  });
  // Keep last 100 detections
  const trimmed = history.slice(0, 100);
  return setStorage(StorageKey.DETECTION_HISTORY, trimmed);
}

/**
 * Get detection history
 * @returns {Promise<array>}
 */
export async function getHistory() {
  return getStorage(StorageKey.DETECTION_HISTORY, []);
}

/**
 * Clear all storage
 * @returns {Promise}
 */
export async function clearAllStorage() {
  return chrome.storage.local.clear();
}

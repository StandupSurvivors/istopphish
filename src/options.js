import { sendToBackground } from './utils/messaging.js';
import { getSettings, updateSettings, getStorage, removeFromWhitelist, whitelistDomain } from './utils/storage.js';
import { StorageKey } from './utils/storage.js';
import { logger } from './utils/logger.js';

let settings = {};
let whitelist = [];

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        settings = await getSettings();
        whitelist = await getStorage(StorageKey.WHITELIST, []);
        
        loadSettingsUI();
        loadWhitelistUI();
        attachEventListeners();
    } catch (error) {
        logger.error('Options init error', { error: error.message });
    }
});

function attachEventListeners() {
    document.getElementById('test-backend-btn').addEventListener('click', testBackend);
    document.getElementById('add-whitelist-btn').addEventListener('click', addToWhitelist);
    document.getElementById('newWhitelistDomain').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addToWhitelist();
    });
}

function loadSettingsUI() {
    document.getElementById('enabled').checked = settings.enabled !== false;
    document.getElementById('highlightSuspicious').checked = settings.highlightSuspicious !== false;
    document.getElementById('showWarnings').checked = settings.showWarnings !== false;
    document.getElementById('sensitivity').value = settings.sensitivity || 'medium';
    document.getElementById('useLocalAnalysis').checked = settings.useLocalAnalysis !== false;
    document.getElementById('useLLMAnalysis').checked = settings.useLLMAnalysis !== false;
    document.getElementById('backendUrl').value = settings.backendUrl || 'http://localhost:8000';
}

function loadWhitelistUI() {
    const container = document.getElementById('whitelist-list');
    
    if (whitelist.length > 0) {
        const html = `
            <h3>Whitelisted Domains:</h3>
            <div class="whitelist-items">
                ${whitelist.map(domain => `
                    <div class="whitelist-item">
                        <span>${domain}</span>
                        <button class="btn-remove" onclick="removeWhitelistItem('${domain}')">✕</button>
                    </div>
                `).join('')}
            </div>
        `;
        container.innerHTML = html;
    } else {
        container.innerHTML = '<div class="empty-state"><p>No domains whitelisted yet</p></div>';
    }
}

async function saveSetting(key) {
    try {
        const value = document.getElementById(key).type === 'checkbox' 
            ? document.getElementById(key).checked 
            : document.getElementById(key).value;
        
        settings[key] = value;
        await updateSettings({ [key]: value });
        await sendToBackground('UPDATE_SETTINGS', { settings: { [key]: value } });
        
        showSaveMessage(`${key} saved!`, 'success');
    } catch (error) {
        logger.error('Settings save error', { error: error.message });
        showSaveMessage('Failed to save settings', 'error');
    }
}

async function testBackend() {
    const resultEl = document.getElementById('test-result');
    
    try {
        resultEl.textContent = 'Testing...';
        resultEl.className = '';
        resultEl.style.display = 'block';
        
        const response = await sendToBackground('HEALTH_CHECK');
        
        if (response.backendHealthy) {
            resultEl.textContent = '✓ Backend is online and responsive';
            resultEl.className = 'test-result success';
        } else {
            resultEl.textContent = '✕ Backend is offline. Using local detection only.';
            resultEl.className = 'test-result error';
        }
    } catch (error) {
        resultEl.textContent = `✕ Connection failed: ${error.message}`;
        resultEl.className = 'test-result error';
    }
}

async function addToWhitelist() {
    const input = document.getElementById('newWhitelistDomain');
    const domain = input.value.trim().toLowerCase();
    
    if (!domain) {
        showSaveMessage('Please enter a domain', 'error');
        return;
    }
    
    if (!domain.includes('.')) {
        showSaveMessage('Please enter a valid domain (e.g., example.com)', 'error');
        return;
    }
    
    if (whitelist.includes(domain)) {
        showSaveMessage('Domain already whitelisted', 'error');
        return;
    }
    
    try {
        await whitelistDomain(domain);
        whitelist.push(domain);
        input.value = '';
        loadWhitelistUI();
        showSaveMessage(`Added ${domain} to whitelist`, 'success');
    } catch (error) {
        logger.error('Whitelist add error', { error: error.message });
        showSaveMessage('Failed to add domain', 'error');
    }
}

async function removeWhitelistItem(domain) {
    try {
        await removeFromWhitelist(domain);
        whitelist = whitelist.filter(d => d !== domain);
        loadWhitelistUI();
        showSaveMessage(`Removed ${domain} from whitelist`, 'success');
    } catch (error) {
        logger.error('Whitelist remove error', { error: error.message });
        showSaveMessage('Failed to remove domain', 'error');
    }
}

function showSaveMessage(text, type) {
    const indicator = document.getElementById('save-indicator');
    indicator.textContent = text;
    indicator.className = `save-indicator ${type}`;
    indicator.style.display = 'block';
    
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 3000);
}

// Make functions available globally
window.saveSetting = saveSetting;
window.testBackend = testBackend;
window.addToWhitelist = addToWhitelist;
window.removeWhitelistItem = removeWhitelistItem;

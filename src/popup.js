import { sendToBackground } from './utils/messaging.js';
import { logger } from './utils/logger.js';

// Initialize popup on DOM ready
document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
    try {
        await checkBackendHealth();
        await analyzeCurrentPage();
        attachEventListeners();
    } catch (error) {
        logger.error('Popup init error', { error: error.message });
    }
}

function attachEventListeners() {
    document.getElementById('whitelist-btn')?.addEventListener('click', async () => {
        if (window.currentUrl) {
            try {
                const url = new URL(window.currentUrl);
                const domain = url.hostname;
                await sendToBackground('WHITELIST_DOMAIN', { domain });
                alert(`✓ Domain whitelisted: ${domain}`);
                displayNoThreats();
            } catch (error) {
                logger.error('Whitelist error', { error: error.message });
                alert('Failed to whitelist domain');
            }
        }
    });

    document.getElementById('report-btn')?.addEventListener('click', () => {
        if (window.currentUrl) {
            try {
                chrome.tabs.create({
                    url: `https://safebrowsing.google.com/safebrowsing/report_phish/?url=${encodeURIComponent(window.currentUrl)}`
                });
            } catch (error) {
                logger.error('Report error', { error: error.message });
                alert('Failed to open report form');
            }
        }
    });

    document.getElementById('open-settings-btn')?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    document.getElementById('view-history-btn')?.addEventListener('click', () => {
        alert('History view coming soon');
    });

    document.getElementById('get-help-btn')?.addEventListener('click', () => {
        alert('Help page coming soon');
    });
}

async function checkBackendHealth() {
    try {
        const response = await sendToBackground('HEALTH_CHECK');
        const statusEl = document.getElementById('backend-status');
        
        if (response.backendHealthy) {
            statusEl.textContent = '🟢 Online';
            statusEl.classList.remove('offline');
            statusEl.classList.add('online');
            document.getElementById('backend-note').style.display = 'none';
        } else {
            statusEl.textContent = '🔴 Offline';
            statusEl.classList.remove('online');
            statusEl.classList.add('offline');
            document.getElementById('backend-note').style.display = 'block';
        }
    } catch (error) {
        const statusEl = document.getElementById('backend-status');
        statusEl.textContent = '🔴 Offline';
        statusEl.classList.remove('online');
        statusEl.classList.add('offline');
        document.getElementById('backend-note').style.display = 'block';
    }
}

async function analyzeCurrentPage() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';
    document.getElementById('no-threats').style.display = 'none';
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const response = await sendToBackground('ANALYZE_URL', {
            url: tab.url,
            context: {
                pageContent: '',
                localDetections: []
            }
        });

        if (response.success && response.data) {
            const analysis = response.data;
            displayResult(analysis, tab.url);
            updateStatus(analysis.risk_level);
        } else {
            displayNoThreats();
        }
    } catch (error) {
        logger.error('Page analysis error', { error: error.message });
        displayNoThreats();
    }
}

function displayResult(analysis, url) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result').style.display = 'block';
    
    const summary = `
        <div class="risk-badge ${analysis.risk_level}">${analysis.risk_level.toUpperCase()} RISK</div>
        <p class="confidence">Confidence: ${Math.round(analysis.confidence)}%</p>
    `;
    document.getElementById('threat-summary').innerHTML = summary;
    
    const threats = analysis.phishing_indicators || [];
    if (threats.length > 0) {
        document.getElementById('threats-list').style.display = 'block';
        const threatsList = threats.map(ind => 
            `<li>${ind}</li>`
        ).join('');
        document.getElementById('threats').innerHTML = threatsList;
    } else {
        document.getElementById('threats-list').style.display = 'none';
    }
    
    if (analysis.risk_level !== 'safe') {
        document.getElementById('actions').style.display = 'block';
        // Store URL for whitelist/report buttons
        window.currentUrl = url;
    } else {
        document.getElementById('actions').style.display = 'none';
    }
}

function displayNoThreats() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('result').style.display = 'none';
    document.getElementById('no-threats').style.display = 'block';
}

function updateStatus(riskLevel) {
    const statusMap = {
        'safe': { text: '✓ Safe', class: 'safe' },
        'low': { text: '⚠️ Low Risk', class: 'low' },
        'medium': { text: '⚠️ Medium Risk', class: 'medium' },
        'high': { text: '🚨 High Risk', class: 'high' },
        'critical': { text: '🚨 Critical', class: 'critical' }
    };
    const status = statusMap[riskLevel] || { text: 'Unknown', class: 'unknown' };
    const statusEl = document.getElementById('status');
    statusEl.textContent = status.text;
    statusEl.className = `status ${status.class}`;
}

// Button handlers
document.getElementById('whitelist-btn')?.addEventListener('click', async () => {
    if (window.currentUrl) {
        try {
            const url = new URL(window.currentUrl);
            const domain = url.hostname;
            await sendToBackground('WHITELIST_DOMAIN', { domain });
            alert(`✓ Domain whitelisted: ${domain}`);
            displayNoThreats();
        } catch (error) {
            logger.error('Whitelist error', { error: error.message });
            alert('Failed to whitelist domain');
        }
    }
});

document.getElementById('report-btn')?.addEventListener('click', () => {
    if (window.currentUrl) {
        try {
            chrome.tabs.create({
                url: `https://safebrowsing.google.com/safebrowsing/report_phish/?url=${encodeURIComponent(window.currentUrl)}`
            });
        } catch (error) {
            logger.error('Report error', { error: error.message });
            alert('Failed to open report form');
        }
    }
});

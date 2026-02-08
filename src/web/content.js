// Function to detect phishing elements
function detectPhishyElements() {
  const phishyElements = {
    suspiciousLinks: [],
    suspiciousForms: [],
    suspiciousInputs: [],
    redirectLinks: []
  };

  // Check for links with mismatched text and href
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    const text = link.textContent.trim();
    
    // Check if link text doesn't match href (common phishing tactic)
    if (text && href && !href.includes(text.split(' ')[0]) && text.length > 0) {
      phishyElements.suspiciousLinks.push({
        text: text,
        href: href,
        element: link
      });
    }

    // Check for links redirecting to external domains
    if (href && (href.startsWith('http') || href.startsWith('//'))) {
      try {
        const linkUrl = new URL(href, window.location.href);
        const currentDomain = new URL(window.location.href).hostname;
        
        if (!linkUrl.hostname.includes(currentDomain)) {
          phishyElements.redirectLinks.push({
            text: text,
            href: href,
            targetDomain: linkUrl.hostname
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
    
    // Check if form action points to external domain
    if (action && action.startsWith('http')) {
      try {
        const formUrl = new URL(action);
        const currentDomain = new URL(window.location.href).hostname;
        
        if (!formUrl.hostname.includes(currentDomain)) {
          phishyElements.suspiciousForms.push({
            action: action,
            method: method,
            targetDomain: formUrl.hostname,
            fields: Array.from(form.querySelectorAll('input[type="password"], input[type="email"]')).map(f => f.name || f.type)
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
        name: input.name,
        isHttps: isHttps,
        formAction: form ? form.getAttribute('action') : 'inline form'
      });
    }
  });

  return phishyElements;
}

// Run detection and log results
const phishyElements = detectPhishyElements();
console.log("Phishing Detection Results:", phishyElements);

if (phishyElements.suspiciousLinks.length > 0) {
  console.warn("Suspicious Links Found:", phishyElements.suspiciousLinks);
}

if (phishyElements.suspiciousForms.length > 0) {
  console.warn("Suspicious Forms Found:", phishyElements.suspiciousForms);
}

if (phishyElements.suspiciousInputs.length > 0) {
  console.warn("Suspicious Password Inputs Found:", phishyElements.suspiciousInputs);
}

if (phishyElements.redirectLinks.length > 0) {
  console.warn("External Redirect Links Found:", phishyElements.redirectLinks);
}

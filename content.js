// Content script - minimal, rectangle-only snip relay
(function() {
  'use strict';

  function init() {
    console.log('Snip content script loaded');
    setupEventListeners();
  }

  function setupEventListeners() {
    // Listen for snip selection events from injected handlers
    window.addEventListener('SNIP_SELECTION', handleSnipSelection);
  }

  // Handle snip selection and process the capture
  async function handleSnipSelection(event) {
    const { left, top, width, height } = event.detail;
    console.log('Snip selection received:', { left, top, width, height });

    try {
      showLoadingIndicator();

      if (!chrome.runtime?.id) {
        throw new Error('Extension context lost. Please refresh and try again.');
      }

      const captureResponse = await sendMessageWithRetry({ type: 'CAPTURE_VISIBLE_TAB' }, 3);
      if (!captureResponse?.success) throw new Error(captureResponse?.error || 'Capture failed');

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = async () => {
        try {
          ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
          const croppedBase64 = canvas.toDataURL('image/png').split(',')[1];

          const analyzeResponse = await sendMessageWithRetry({ type: 'ANALYZE_IMAGE', imageBase64: croppedBase64 }, 2);
          if (!analyzeResponse?.success) throw new Error(analyzeResponse?.error || 'Analysis failed');
        } catch (e) {
          console.error('Image analysis failed:', e);
          await extractTextFromArea(left, top, width, height);
        } finally {
          hideLoadingIndicator();
          cleanupSelection();
        }
      };
      img.onerror = () => { throw new Error('Failed to load captured image'); };
      img.src = captureResponse.dataUrl;

    } catch (error) {
      console.error('Snip processing failed:', error);
      try {
        await extractTextFromArea(left, top, width, height);
      } catch (_) {
        showErrorMessage(getErrorMessage(error));
      }
      hideLoadingIndicator();
      cleanupSelection();
    }
  }

  // Helper: send messages with retry
  async function sendMessageWithRetry(message, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (!chrome.runtime?.id) throw new Error('Extension context invalidated');
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(message, (resp) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(resp);
          });
        });
        return response;
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  function getErrorMessage(error) {
    if (String(error?.message || '').includes('Extension context')) return 'Extension reloaded. Refresh page and try again.';
    if (String(error?.message || '').includes('captureVisibleTab')) return 'Screenshot capture failed. Trying text analysis...';
    return `Analysis failed: ${error?.message || 'Unknown error'}`;
  }

  // Text extraction fallback
  async function extractTextFromArea(left, top, width, height) {
    let textContent = '';
    let count = 0;
    document.querySelectorAll('*').forEach(el => {
      const cls = el.className;
      if (typeof cls === 'string' && (cls.includes('temp-search') || cls.includes('snip-'))) return;
      const rect = el.getBoundingClientRect();
      if (rect.left < left + width && rect.right > left && rect.top < top + height && rect.bottom > top) {
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const t = node.textContent.trim();
            if (t.length > 2) { textContent += t + ' '; count++; }
          }
        });
      }
    });
    if (textContent.trim()) showTextResults(textContent.trim().replace(/\s+/g, ' '), count);
    else throw new Error('No readable text found in selection');
  }

  // Result UI
  function showTextResults(text, elementCount) {
    const existing = document.querySelector('.snip-result-popup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.className = 'snip-result-popup';
    popup.style.cssText = 'position:fixed;top:50%;right:20px;transform:translateY(-50%);width:350px;max-height:500px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.2);padding:20px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:14px;z-index:1000000;overflow-y:auto;';
    popup.innerHTML = `<h3>📝 Text Extraction Results</h3><div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:10px 0;line-height:1.6;max-height:300px;overflow:auto;">${text.replace(/\n/g,'<br>')}</div><p style="font-size:12px;color:#666;margin-top:15px;border-top:1px solid #eee;padding-top:10px;">📊 Extracted from ${elementCount} text elements</p><button onclick="this.parentElement.remove()" style="position:absolute;top:10px;right:15px;border:none;background:none;font-size:20px;cursor:pointer;color:#999;">&times;</button>`;
    document.body.appendChild(popup);
    setTimeout(() => { if (popup.parentElement) popup.remove(); }, 30000);
  }

  function showLoadingIndicator() {
    hideLoadingIndicator();
    const el = document.createElement('div');
    el.className = 'snip-loading';
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.8);color:#fff;padding:20px;border-radius:8px;font-family:Arial,sans-serif;z-index:1000001;';
    el.textContent = '🤖 AI is analyzing your selection...';
    document.body.appendChild(el);
  }
  
  function hideLoadingIndicator() { 
    const el = document.querySelector('.snip-loading'); 
    if (el) el.remove(); 
  }
  
  function cleanupSelection() { 
    const r = document.querySelector('.temp-search-rectangle'); 
    if (r) r.remove(); 
  }
  
  function showErrorMessage(msg) { 
    const e = document.createElement('div'); 
    e.style.cssText='position:fixed;top:20px;right:20px;background:#ff4444;color:#fff;padding:15px;border-radius:8px;font-family:Arial,sans-serif;z-index:1000001;'; 
    e.textContent=msg; 
    document.body.appendChild(e); 
    setTimeout(()=>e.remove(),5000); 
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); 
  else init();
})();

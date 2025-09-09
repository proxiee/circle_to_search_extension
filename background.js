// Background service worker - minimal rectangle snipping
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TOGGLE_CIRCLE_MODE':
      toggleSnipMode(message.tabId)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'CAPTURE_VISIBLE_TAB':
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        sendResponse({ success: !chrome.runtime.lastError, dataUrl, error: chrome.runtime.lastError?.message });
      });
      return true;

    case 'ANALYZE_IMAGE':
      sendToGeminiAPI(message.imageBase64)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
  }
});

async function toggleSnipMode(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const restrictedUrls = ['chrome://', 'chrome-extension://', 'about:', 'file://'];
  if (restrictedUrls.some(p => tab.url.startsWith(p))) throw new Error('Cannot snip on this page. Try a regular website.');

  await chrome.scripting.executeScript({
    target: { tabId },
    function: () => {
      if (window.__snip_active__) return; // Already active
      window.__snip_active__ = true;

      const inst = document.createElement('div');
      inst.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:10px 20px;border-radius:4px;font-family:Arial,sans-serif;font-size:14px;z-index:1000001;';
      inst.textContent = 'Draw a rectangle around content to analyze • Press ESC to exit';
      document.body.appendChild(inst);

      document.querySelectorAll('.temp-search-rectangle').forEach(el => el.remove());
      let isDrawing = false, startX, startY;

      function drawRect(sx, sy, cx, cy) {
        const l = Math.min(sx, cx), t = Math.min(sy, cy), w = Math.abs(cx - sx), h = Math.abs(cy - sy);
        const old = document.querySelector('.temp-search-rectangle');
        if (old) old.remove();
        const rect = document.createElement('div');
        rect.className = 'temp-search-rectangle';
        rect.style.cssText = `position:fixed;left:${l}px;top:${t}px;width:${w}px;height:${h}px;border:2px solid #0078d4;background:rgba(0,120,212,.1);pointer-events:none;z-index:999999;box-shadow:0 0 0 9999px rgba(0,0,0,.3);`;
        document.body.appendChild(rect);
      }

      document.addEventListener('mousedown', e => { e.preventDefault(); isDrawing = true; startX = e.clientX; startY = e.clientY; drawRect(startX, startY, startX + 2, startY + 2); }, true);
      document.addEventListener('mousemove', e => { if (!isDrawing) return; e.preventDefault(); drawRect(startX, startY, e.clientX, e.clientY); }, true);
      document.addEventListener('mouseup', e => {
        if (!isDrawing) return;
        e.preventDefault(); isDrawing = false;
        const w = Math.abs(e.clientX - startX), h = Math.abs(e.clientY - startY);
        if (w < 20 || h < 20) { const r = document.querySelector('.temp-search-rectangle'); if (r) r.remove(); return; }
        const l = Math.min(startX, e.clientX), t = Math.min(startY, e.clientY);
        window.dispatchEvent(new CustomEvent('SNIP_SELECTION', { detail: { left: l, top: t, width: w, height: h } }));
      }, true);
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          const r = document.querySelector('.temp-search-rectangle'); if (r) r.remove();
          inst.remove(); window.__snip_active__ = false;
        }
      }, true);
    }
  });
}

async function sendToGeminiAPI(imageData) {
  // TODO: Replace with your actual API key from config.js
  const API_KEY = 'YOUR_GEMINI_API_KEY_HERE';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'What do you see in this image? Describe clearly and extract any text accurately.' }, { inline_data: { mime_type: 'image/png', data: imageData } }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1000 }
    })
  });
  const result = await response.json();
  displayGeminiResults(result);
}
function displayGeminiResults(result) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: (r) => {
        let content = '<h3>🤖 AI Image Analysis</h3>';
        if (r.error) content += `<p style="color:red;">❌ Error: ${r.error.message}</p>`;
        else if (r.candidates?.[0]?.content?.parts?.[0]?.text) {
          const txt = r.candidates[0].content.parts[0].text;
          content += `<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin:10px 0;line-height:1.5;">${txt.replace(/\n/g,'<br>')}</div><p style="font-size:12px;color:#666;margin-top:15px;border-top:1px solid #eee;padding-top:10px;">🤖 Analyzed by Gemini AI</p>`;
        } else content += '<p style="color:#666;font-style:italic;">No analysis available.</p>';
        const old = document.querySelector('.snip-result-popup'); if (old) old.remove();
        const popup = document.createElement('div'); popup.className = 'snip-result-popup';
        popup.style.cssText = 'position:fixed;top:50%;right:20px;transform:translateY(-50%);width:350px;max-height:500px;background:#fff;border:1px solid #ddd;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.2);padding:20px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:14px;z-index:1000000;overflow-y:auto;';
        popup.innerHTML = content + '<button onclick="this.parentElement.remove()" style="position:absolute;top:10px;right:15px;border:none;background:none;font-size:20px;cursor:pointer;color:#999;">&times;</button>';
        document.body.appendChild(popup); setTimeout(() => { if (popup.parentElement) popup.remove(); }, 30000);
      },
      args: [result]
    });
  });
}

chrome.action.onClicked.addListener(async (tab) => { await toggleSnipMode(tab.id); });

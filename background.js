// Background service worker for Circle to Search extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Circle to Search extension installed');
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SEARCH_REQUEST':
      handleSearchRequest(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep the message channel open for async response
    
    case 'TOGGLE_CIRCLE_MODE':
      toggleCircleMode(sender.tab.id);
      break;
    
    default:
      console.log('Unknown message type:', message.type);
  }
});

// Toggle circle selection mode on the current tab
async function toggleCircleMode(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      function: () => {
        // This will be injected into the page
        if (window.circleSearchActive) {
          window.circleSearchActive = false;
          document.body.style.cursor = 'default';
        } else {
          window.circleSearchActive = true;
          document.body.style.cursor = 'crosshair';
        }
      }
    });
  } catch (error) {
    console.error('Failed to toggle circle mode:', error);
  }
}

// Handle search requests (placeholder for actual implementation)
async function handleSearchRequest(searchData) {
  // TODO: Implement actual search logic
  // This could integrate with various APIs like:
  // - Google Search API
  // - OpenAI Vision API
  // - Custom image recognition service
  
  console.log('Search request received:', searchData);
  
  // Mock response for now
  return {
    query: searchData.text || 'Visual search',
    results: [
      {
        title: 'Example Result',
        description: 'This is a placeholder result for the circled content.',
        url: 'https://example.com'
      }
    ],
    confidence: 0.85
  };
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  await toggleCircleMode(tab.id);
});

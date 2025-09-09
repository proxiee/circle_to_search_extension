// Popup JavaScript for Circle to Search extension
document.addEventListener('DOMContentLoaded', async function() {
  // DOM elements
  const toggleBtn = document.getElementById('toggleBtn');
  const helpBtn = document.getElementById('helpBtn');
  const instructions = document.getElementById('instructions');
  const recentSearches = document.getElementById('recentSearches');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const searchHistory = document.getElementById('searchHistory');
  const settingsLink = document.getElementById('settingsLink');
  const feedbackLink = document.getElementById('feedbackLink');

  let isCircleModeActive = false;
  let currentTab = null;

  // Initialize popup
  await init();

  // Event listeners
  toggleBtn.addEventListener('click', handleToggleCircleMode);
  helpBtn.addEventListener('click', toggleInstructions);
  settingsLink.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  feedbackLink.addEventListener('click', () => {
    window.open('https://github.com/your-repo/circle-to-search/issues', '_blank');
  });

  // Initialize popup state
  async function init() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;

      // Load saved state
      await loadState();
      
      // Load recent searches
      await loadRecentSearches();

      updateUI();
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      showError('Failed to initialize extension');
    }
  }

  // Load extension state from storage
  async function loadState() {
    try {
      const result = await chrome.storage.local.get(['circleMode', 'recentSearches']);
      isCircleModeActive = result.circleMode || false;
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  // Save extension state to storage
  async function saveState() {
    try {
      await chrome.storage.local.set({
        circleMode: isCircleModeActive,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  // Handle toggle circle mode
  async function handleToggleCircleMode() {
    if (!currentTab) {
      showError('No active tab found');
      return;
    }

    try {
      toggleBtn.disabled = true;
      
      // Send message to background script to toggle circle mode
      const response = await chrome.runtime.sendMessage({
        type: 'TOGGLE_CIRCLE_MODE',
        tabId: currentTab.id
      });

      if (response && response.success) {
        isCircleModeActive = !isCircleModeActive;
        await saveState();
        updateUI();
        
        // Close popup after activation to allow user to circle
        if (isCircleModeActive) {
          setTimeout(() => window.close(), 500);
        }
      } else {
        showError('Failed to toggle circle mode');
      }
    } catch (error) {
      console.error('Error toggling circle mode:', error);
      showError('Failed to activate circle mode');
    } finally {
      toggleBtn.disabled = false;
    }
  }

  // Toggle instructions visibility
  function toggleInstructions() {
    const isVisible = instructions.style.display !== 'none';
    instructions.style.display = isVisible ? 'none' : 'block';
    recentSearches.style.display = isVisible ? 'block' : 'none';
    
    helpBtn.textContent = isVisible ? 'How it works' : 'Hide instructions';
  }

  // Update UI based on current state
  function updateUI() {
    if (isCircleModeActive) {
      statusIndicator.className = 'status-indicator active';
      statusText.textContent = 'Circle mode active';
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="12" height="12" stroke="currentColor" stroke-width="2"/>
        </svg>
        Stop Circling
      `;
      toggleBtn.className = 'primary-btn stop';
    } else {
      statusIndicator.className = 'status-indicator';
      statusText.textContent = 'Ready to search';
      toggleBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
          <circle cx="21" cy="21" r="2" fill="currentColor"/>
        </svg>
        Start Circling
      `;
      toggleBtn.className = 'primary-btn';
    }
  }

  // Load recent searches from storage
  async function loadRecentSearches() {
    try {
      const result = await chrome.storage.local.get(['searchHistory']);
      const history = result.searchHistory || [];
      
      if (history.length > 0) {
        displayRecentSearches(history.slice(0, 5)); // Show last 5 searches
      } else {
        searchHistory.innerHTML = '<p class="no-history">No recent searches</p>';
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
      searchHistory.innerHTML = '<p class="no-history">Failed to load history</p>';
    }
  }

  // Display recent searches in the UI
  function displayRecentSearches(searches) {
    searchHistory.innerHTML = '';
    
    searches.forEach((search, index) => {
      const searchItem = document.createElement('div');
      searchItem.className = 'search-item';
      
      const timestamp = new Date(search.timestamp).toLocaleDateString();
      const preview = search.text ? 
        search.text.substring(0, 50) + (search.text.length > 50 ? '...' : '') :
        'Visual search';
      
      searchItem.innerHTML = `
        <div class="search-preview">${escapeHtml(preview)}</div>
        <div class="search-meta">
          <span class="search-date">${timestamp}</span>
          <span class="search-elements">${search.elements || 0} elements</span>
        </div>
      `;
      
      searchItem.addEventListener('click', () => {
        // Could implement re-running the search or showing more details
        console.log('Search item clicked:', search);
      });
      
      searchHistory.appendChild(searchItem);
    });
  }

  // Show error message
  function showError(message) {
    statusIndicator.className = 'status-indicator error';
    statusText.textContent = message;
    
    // Reset after 3 seconds
    setTimeout(() => {
      updateUI();
    }, 3000);
  }

  // Escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CIRCLE_MODE_CHANGED') {
      isCircleModeActive = message.active;
      updateUI();
      sendResponse({ success: true });
    }
  });

  // Handle tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (currentTab && tabId === currentTab.id && changeInfo.status === 'complete') {
      // Tab reloaded, circle mode is likely deactivated
      isCircleModeActive = false;
      updateUI();
    }
  });

  // Save search to history
  async function saveSearchToHistory(searchData) {
    try {
      const result = await chrome.storage.local.get(['searchHistory']);
      const history = result.searchHistory || [];
      
      // Add new search to beginning of array
      history.unshift({
        ...searchData,
        id: Date.now().toString(),
        timestamp: Date.now()
      });
      
      // Keep only last 50 searches
      const trimmedHistory = history.slice(0, 50);
      
      await chrome.storage.local.set({ searchHistory: trimmedHistory });
      
      // Reload recent searches display
      await loadRecentSearches();
    } catch (error) {
      console.error('Failed to save search to history:', error);
    }
  }

  // Handle keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Toggle circle mode with Ctrl+Shift+C (or Cmd+Shift+C on Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      handleToggleCircleMode();
    }
    
    // Show help with F1 or ?
    if (e.key === 'F1' || e.key === '?') {
      e.preventDefault();
      toggleInstructions();
    }
  });
});

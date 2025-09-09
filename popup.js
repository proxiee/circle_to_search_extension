document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleBtn');

  toggleBtn.addEventListener('click', async function() {
    try {
      toggleBtn.disabled = true;
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send toggle message to background script
      const response = await chrome.runtime.sendMessage({
        type: 'TOGGLE_CIRCLE_MODE',
        tabId: tab.id
      });

      if (response && response.success) {
        // Close popup after activation
        window.close();
      } else {
        alert(response?.error || 'Failed to activate rectangle mode');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      toggleBtn.disabled = false;
    }
  });
});

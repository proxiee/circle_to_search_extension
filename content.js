// Content script for Circle to Search functionality
(function() {
  'use strict';

  let isDrawing = false;
  let startX, startY;
  let circleOverlay = null;
  let selectedElements = [];
  
  // Initialize the extension
  function init() {
    console.log('Circle to Search content script loaded');
    setupEventListeners();
    createCircleOverlay();
  }

  // Create overlay element for drawing circles
  function createCircleOverlay() {
    if (circleOverlay) return;
    
    circleOverlay = document.createElement('div');
    circleOverlay.className = 'circle-search-overlay';
    circleOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999999;
      display: none;
    `;
    document.body.appendChild(circleOverlay);
  }

  // Setup event listeners for mouse interactions
  function setupEventListeners() {
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TOGGLE_CIRCLE_MODE') {
        toggleCircleMode();
        sendResponse({ success: true });
      }
    });
  }

  // Toggle circle selection mode
  function toggleCircleMode() {
    window.circleSearchActive = !window.circleSearchActive;
    
    if (window.circleSearchActive) {
      document.body.style.cursor = 'crosshair';
      circleOverlay.style.display = 'block';
      showInstructions();
    } else {
      document.body.style.cursor = 'default';
      circleOverlay.style.display = 'none';
      clearSelection();
      hideInstructions();
    }
  }

  // Handle mouse down event
  function handleMouseDown(e) {
    if (!window.circleSearchActive) return;
    
    e.preventDefault();
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
    
    clearPreviousCircle();
  }

  // Handle mouse move event
  function handleMouseMove(e) {
    if (!window.circleSearchActive || !isDrawing) return;
    
    e.preventDefault();
    drawCircle(startX, startY, e.clientX, e.clientY);
  }

  // Handle mouse up event
  function handleMouseUp(e) {
    if (!window.circleSearchActive || !isDrawing) return;
    
    e.preventDefault();
    isDrawing = false;
    
    // Calculate circle bounds and find elements within
    const radius = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
    if (radius > 10) { // Minimum circle size
      selectElementsInCircle(startX, startY, radius);
    }
  }

  // Handle keyboard shortcuts
  function handleKeyDown(e) {
    if (e.key === 'Escape' && window.circleSearchActive) {
      toggleCircleMode();
    }
  }

  // Draw circle on overlay
  function drawCircle(centerX, centerY, currentX, currentY) {
    const radius = Math.sqrt(Math.pow(currentX - centerX, 2) + Math.pow(currentY - centerY, 2));
    
    clearPreviousCircle();
    
    const circle = document.createElement('div');
    circle.className = 'search-circle';
    circle.style.cssText = `
      position: absolute;
      left: ${centerX - radius}px;
      top: ${centerY - radius}px;
      width: ${radius * 2}px;
      height: ${radius * 2}px;
      border: 3px solid #4285f4;
      border-radius: 50%;
      background: rgba(66, 133, 244, 0.1);
      pointer-events: none;
    `;
    
    circleOverlay.appendChild(circle);
  }

  // Clear previous circle
  function clearPreviousCircle() {
    const existingCircles = circleOverlay.querySelectorAll('.search-circle');
    existingCircles.forEach(circle => circle.remove());
  }

  // Select elements within the drawn circle
  function selectElementsInCircle(centerX, centerY, radius) {
    selectedElements = [];
    const allElements = document.querySelectorAll('*:not(.circle-search-overlay):not(.search-circle):not(.circle-instructions)');
    
    allElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const elementCenterX = rect.left + rect.width / 2;
      const elementCenterY = rect.top + rect.height / 2;
      
      // Check if element center is within the circle
      const distance = Math.sqrt(Math.pow(elementCenterX - centerX, 2) + Math.pow(elementCenterY - centerY, 2));
      
      if (distance <= radius && rect.width > 0 && rect.height > 0) {
        selectedElements.push({
          element: element,
          text: element.textContent?.trim() || '',
          tagName: element.tagName,
          attributes: getElementAttributes(element),
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }
        });
      }
    });

    if (selectedElements.length > 0) {
      processSelectedElements();
    }
  }

  // Get relevant attributes from element
  function getElementAttributes(element) {
    const relevantAttrs = ['src', 'alt', 'title', 'data-*', 'aria-label'];
    const attrs = {};
    
    relevantAttrs.forEach(attr => {
      if (attr.endsWith('*')) {
        // Handle data-* attributes
        Array.from(element.attributes).forEach(attribute => {
          if (attribute.name.startsWith(attr.slice(0, -1))) {
            attrs[attribute.name] = attribute.value;
          }
        });
      } else if (element.hasAttribute(attr)) {
        attrs[attr] = element.getAttribute(attr);
      }
    });
    
    return attrs;
  }

  // Process selected elements and send search request
  function processSelectedElements() {
    // Extract text content and context
    const textContent = selectedElements
      .map(item => item.text)
      .filter(text => text.length > 0)
      .join(' ');
    
    // Extract images
    const images = selectedElements
      .filter(item => item.tagName === 'IMG')
      .map(item => ({
        src: item.attributes.src,
        alt: item.attributes.alt || '',
        title: item.attributes.title || ''
      }));

    const searchData = {
      text: textContent,
      images: images,
      elements: selectedElements.length,
      timestamp: Date.now()
    };

    // Send search request to background script
    chrome.runtime.sendMessage({
      type: 'SEARCH_REQUEST',
      data: searchData
    }, (response) => {
      if (response && response.success) {
        displaySearchResults(response.data);
      } else {
        console.error('Search failed:', response?.error);
        showError('Search failed. Please try again.');
      }
    });

    // Visual feedback
    highlightSelectedElements();
  }

  // Highlight selected elements
  function highlightSelectedElements() {
    selectedElements.forEach(item => {
      item.element.style.outline = '2px solid #4285f4';
      item.element.style.outlineOffset = '2px';
    });

    // Remove highlight after 2 seconds
    setTimeout(() => {
      selectedElements.forEach(item => {
        item.element.style.outline = '';
        item.element.style.outlineOffset = '';
      });
    }, 2000);
  }

  // Display search results
  function displaySearchResults(results) {
    // Create results popup
    const resultsPopup = document.createElement('div');
    resultsPopup.className = 'circle-search-results';
    resultsPopup.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      padding: 20px;
      max-width: 400px;
      max-height: 500px;
      overflow-y: auto;
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      border: none;
      background: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    `;
    closeButton.onclick = () => resultsPopup.remove();

    const title = document.createElement('h3');
    title.textContent = 'Search Results';
    title.style.cssText = 'margin: 0 0 15px 0; color: #333;';

    resultsPopup.appendChild(closeButton);
    resultsPopup.appendChild(title);

    if (results.results && results.results.length > 0) {
      results.results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.style.cssText = 'margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee;';
        
        resultItem.innerHTML = `
          <h4 style="margin: 0 0 5px 0; color: #1a0dab;">${result.title}</h4>
          <p style="margin: 0 0 5px 0; color: #545454; font-size: 14px;">${result.description}</p>
          ${result.url ? `<a href="${result.url}" target="_blank" style="color: #1a0dab; text-decoration: none; font-size: 14px;">${result.url}</a>` : ''}
        `;
        
        resultsPopup.appendChild(resultItem);
      });
    } else {
      const noResults = document.createElement('p');
      noResults.textContent = 'No results found for the selected content.';
      noResults.style.cssText = 'color: #666; font-style: italic;';
      resultsPopup.appendChild(noResults);
    }

    document.body.appendChild(resultsPopup);

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (resultsPopup.parentNode) {
        resultsPopup.remove();
      }
    }, 10000);
  }

  // Show instructions
  function showInstructions() {
    const instructions = document.createElement('div');
    instructions.className = 'circle-instructions';
    instructions.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 1000001;
    `;
    instructions.textContent = 'Circle anything on the page to search • Press ESC to exit';
    document.body.appendChild(instructions);
  }

  // Hide instructions
  function hideInstructions() {
    const instructions = document.querySelector('.circle-instructions');
    if (instructions) {
      instructions.remove();
    }
  }

  // Show error message
  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 1000001;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => errorDiv.remove(), 3000);
  }

  // Clear selection
  function clearSelection() {
    selectedElements = [];
    clearPreviousCircle();
    
    // Remove any existing results
    const existingResults = document.querySelector('.circle-search-results');
    if (existingResults) {
      existingResults.remove();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

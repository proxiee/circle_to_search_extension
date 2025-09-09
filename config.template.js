// Configuration template for Circle to Search Extension
// Copy this file to config.js and add your actual API keys

const CONFIG = {
  // API Configuration - Replace with your actual API key
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  
  // Extension Settings
  EXTENSION_VERSION: '1.0.0',
  DEBUG_MODE: false,
  
  // API Endpoints
  GEMINI_API_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'
};

// Export for use in background script
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}

// Instructions:
// 1. Copy this file to config.js
// 2. Replace 'YOUR_GEMINI_API_KEY_HERE' with your actual Gemini API key
// 3. The config.js file will be ignored by git to keep your keys secure

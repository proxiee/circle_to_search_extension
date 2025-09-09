# Circle to Search Browser Extension

A browser extension that allows you to circle anything on a webpage to get instant search results and information, similar to Google's Circle to Search feature on mobile devices.

## Features

- 🔍 **Circle to Search**: Draw a circle around any content on any webpage
- ⚡ **Instant Results**: Get immediate search results and information
- 🎯 **Smart Selection**: Automatically detects text, images, and other elements within your circle
- 🖱️ **Easy to Use**: Simple click and drag interface
- 📱 **Universal**: Works on any website
- 🔒 **Privacy-Focused**: Local processing with optional external search integration

## Installation

### From Source (Development)

1. **Clone this repository:**
   ```bash
   git clone <repository-url>
   cd circle-to-search-extension
   ```

2. **Set up environment variables:**
   
   Create a `.env` file in the root directory:
   ```env
   # Google Gemini API Key
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   
   # Extension Configuration
   EXTENSION_VERSION=1.0.0
   DEBUG_MODE=false
   ```

3. **Update config.js with your API key:**
   
   Update `config.js` with your API key from the `.env` file:
   ```javascript
   const CONFIG = {
     GEMINI_API_KEY: 'your_actual_gemini_api_key_here',
     // ... other config
   };
   ```

4. **Load in Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory

### From Store (Coming Soon)
The extension will be available on browser extension stores once published.

## Usage

### Basic Usage

1. **Activate Circle Mode**:
   - Click the extension icon in your browser toolbar, OR
   - Click "Start Circling" in the popup, OR
   - Use the keyboard shortcut `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac)

2. **Draw a Circle**:
   - Your cursor will change to a crosshair
   - Click and drag to draw a circle around any content on the page
   - Release to complete the circle

3. **Get Results**:
   - The extension will automatically process the circled content
   - Results will appear in a popup overlay
   - Click the × to close results

4. **Exit Circle Mode**:
   - Press `Escape` key
   - Click the extension icon again
   - Results will automatically disable circle mode

### What You Can Circle

- **Text**: Articles, headlines, quotes, product descriptions
- **Images**: Photos, graphics, logos, screenshots  
- **Mixed Content**: Combination of text and images
- **UI Elements**: Buttons, forms, navigation items
- **Code**: Programming code snippets
- **Data**: Tables, charts, statistics

### Tips for Better Results

- **Size Matters**: Larger circles capture more context
- **Be Precise**: Circle only the content you're interested in
- **Multiple Elements**: Circle related elements together for better context
- **Text Quality**: Clear, readable text produces better results

## Features in Detail

### Smart Element Detection
The extension intelligently identifies and processes different types of content:
- Extracts text content with context
- Identifies images with alt text and metadata
- Preserves spatial relationships between elements
- Filters out irrelevant UI elements

### Search Integration
Currently includes a placeholder search system that can be extended with:
- Google Search API
- OpenAI Vision API  
- Custom image recognition services
- Local AI models
- Web scraping services

### Privacy & Security
- Content processing happens locally when possible
- No data stored without user consent  
- API keys are kept secure and not committed to git
- `.env` and `config.js` files are ignored by version control
- Secure communication with Google Gemini AI API

## Development

### Project Structure

```
circle-to-search-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for background tasks
├── content.js            # Content script for page interaction
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── styles/
│   ├── popup.css         # Popup styling
│   └── content.css       # Content script styling
├── icons/                # Extension icons (placeholder)
├── README.md            # This file
└── .gitignore           # Git ignore rules
```

### Key Components

- **Background Service Worker** (`background.js`): Handles extension lifecycle, API calls, and inter-script communication
- **Content Script** (`content.js`): Manages circle drawing, element selection, and page interaction
- **Popup Interface** (`popup.html`, `popup.js`): User interface for extension control and settings
- **Styling** (`styles/`): CSS for popup and content script elements

### Adding Search Providers

To integrate with search APIs, modify the `handleSearchRequest` function in `background.js`:

```javascript
async function handleSearchRequest(searchData) {
  // Add your search API integration here
  // Examples: Google Search API, OpenAI, custom services
  
  const response = await fetch('your-api-endpoint', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer your-api-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(searchData)
  });
  
  return await response.json();
}
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m "Add feature description"`
5. Push to your branch: `git push origin feature-name`
6. Create a Pull Request

### Testing

- Test on multiple websites with different content types
- Verify circle drawing works smoothly
- Ensure results display correctly
- Test keyboard shortcuts and accessibility
- Validate on different screen sizes and browsers

## Configuration

### Permissions Explained

- `activeTab`: Access to the currently active tab for circle functionality
- `storage`: Store user preferences and search history
- `scripting`: Inject scripts for circle drawing functionality
- `host_permissions`: Access all websites for universal functionality

### Customization

You can customize the extension by modifying:

- **Colors**: Update CSS custom properties in `styles/content.css`
- **Keyboard Shortcuts**: Modify event listeners in `popup.js` and `content.js`
- **Search Behavior**: Update search logic in `background.js`
- **UI Elements**: Modify popup interface in `popup.html`

## Known Issues

- Circle drawing may interfere with some website interactions
- Large circles on complex pages may impact performance
- Some websites with heavy CSS may affect overlay display
- Search results are currently placeholder data

## Roadmap

### Version 1.1
- [ ] Real search API integration
- [ ] Image recognition and OCR
- [ ] Search history persistence
- [ ] Settings page with preferences

### Version 1.2
- [ ] Multiple search provider support
- [ ] Offline search capabilities
- [ ] Enhanced element selection
- [ ] Performance optimizations

### Version 2.0
- [ ] AI-powered content understanding
- [ ] Multi-language support
- [ ] Advanced filtering options
- [ ] Cloud sync and cross-device history

## Support

- **Issues**: Report bugs and request features on GitHub Issues
- **Documentation**: Check the project wiki for detailed guides
- **Community**: Join discussions in GitHub Discussions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by Google's Circle to Search feature
- Built with modern web extension APIs
- Thanks to the open source community for tools and libraries used

# Intelligent Form Filler Chrome Extension

A smart Chrome extension that automatically identifies and fills out web forms using OpenAI's API and your predefined information. The extension uses AI to understand form contexts and intelligently map your information to the appropriate fields.

## Features

- 🤖 AI-powered form field detection and filling
- 🔒 Secure local storage of user information
- 🎨 Modern, user-friendly interface
- ⚡ Quick and efficient form filling
- 🔐 Secure API key management

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Setup

1. Click the extension icon in your Chrome toolbar
2. Enter your OpenAI API key
3. Add your personal information in the format:
   ```
   Name: John Doe
   Email: john@example.com
   Address: 123 Main St
   Phone: (555) 123-4567
   ```
4. Click "Save Settings" to store your information

## Usage

1. Navigate to any webpage with a form
2. Click the extension icon
3. Click the "Fill Form" button
4. The extension will automatically identify and fill out form fields based on your stored information

## Security

- Your OpenAI API key and personal information are stored locally in Chrome's secure storage
- No data is transmitted except to OpenAI's API for form field analysis
- The extension only activates on your command

## Technical Details

The extension consists of several key components:
- `manifest.json`: Extension configuration and permissions
- `popup.html/js`: User interface and settings management
- `contentScript.js`: Form detection and filling logic
- `background.js`: Background service worker for API communication

## Requirements

- Chrome browser (version 88 or higher)
- OpenAI API key
- Active internet connection

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue in the repository. 
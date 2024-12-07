# Intelligent Form Filler for Chrome

Never fill out forms manually again! This Chrome extension uses artificial intelligence to understand web forms and automatically fills them out with your information. It's like having a smart assistant that knows exactly which information goes where.

## What It Does

- 🤖 Automatically understands and fills out web forms
- 🔒 Keeps your information safe on your computer
- 🎨 Simple, easy-to-use interface
- ⚡ Fills forms in seconds
- 🔐 Securely handles your API access

## Getting Started

1. Download this extension files
2. Open Chrome and type `chrome://extensions/` in the address bar
3. Turn on "Developer mode" using the switch in the top right
4. Click "Load unpacked" and choose the folder containing the extension

## First-Time Setup

1. Click the extension's icon in your Chrome toolbar (top-right)
2. Add your OpenAI API key (this powers the AI features)
3. Enter your personal details. You can add context and conditions for different situations:
   ```
   Name: John Doe
   Email: john@example.com
   Work Email: work@company.com (Use for job applications only)
   Address: 123 Main St
   Shipping Address: 456 Box St (Use for shopping sites)
   Phone: (555) 123-4567
   Company: For job applications, use: Tech Corp Inc

   For food delivery sites:
   Delivery Instructions: Leave at door, ring bell twice
   ```
4. Click "Save Settings" and you're ready to go!

The AI will understand these instructions and use the appropriate information based on the website and form context.

## How to Use

There are two ways to fill forms:

1. Using the keyboard shortcut:
   - Mac: Press `Command + Shift + E`
   - Windows/Linux: Press `Ctrl + Shift + E`

2. Using the popup:
   - Click the extension icon
   - Click the "Fill Form" button

The extension will automatically fill all empty form fields on the page, leaving any already filled fields untouched.

## Privacy & Security

- Your personal information stays on your computer
- Your API key and details are stored securely in Chrome
- The extension only works when you activate it
- Only sends form structure data to OpenAI (never your personal info)

## How It Works

The extension uses several parts working together:
- A popup window where you manage your settings
- A smart system that detects forms on websites
- AI technology that understands what each form field needs
- A background process that handles all the AI magic

## System Requirements

- Google Chrome (recent version)
- OpenAI API key
- Internet connection

## Want to Help?

Love this extension? You can help make it better! Feel free to suggest improvements or contribute to the code.

## License

This project is free to use under the MIT License. See the LICENSE file for details.

## Need Help?

Having problems or questions? Just open an issue in this repository and we'll help you out!

---

**Note**: This extension is a developer tool that requires manual installation. It's not available in the Chrome Web Store yet. 
# 🚀 Agg Editor

![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Made With](https://img.shields.io/badge/made%20with-JavaScript-yellow)
![No Backend](https://img.shields.io/badge/backend-none-lightgrey)

**Agg Editor** is a lightweight, fast, and fully browser-based code editor. No installation, no build tools — just open `index.html` and start coding.

It comes with a powerful **Code Changer** panel that helps you quickly add or modify code in any file using flexible search.

---

## ✨ Features

### 📝 Code Editor
- Powered by **CodeMirror 5**
- Support for many languages:
  - HTML, CSS, JavaScript, TypeScript
  - Python, PHP, SQL, Markdown
  - JSON, YAML, Go, Rust, Vue, and more
- Syntax highlighting, auto-close brackets & tags
- Bracket pair colorization
- Emmet abbreviation support (HTML & CSS)
- Code formatting with **Prettier**

### 📂 File Management
- Multi-file tabs
- Create, rename, delete files
- Import multiple files from your computer
- Export single file or entire project as ZIP
- Optional File System Access API support (Chrome/Edge)

### 🧠 Smart Tools
- **Code Changer** panel (Add or Edit code with flexible matching)
- Live preview (for HTML/CSS/JS)
- Find & Replace
- Word wrap toggle
- Zoom in/out
- Fold/unfold code
- Dirty state indicator (unsaved changes)

### 🎨 UI & UX
- Beautiful dark theme (with light theme option)
- Resizable sidebar and preview panel
- Modern, clean interface
- Toast notifications
- Keyboard shortcuts

### 🔧 Code Changer
- Add new code at the beginning, end, or after a keyword
- Edit/replace existing code with flexible whitespace matching
- Works on any open file

---

## 🛠️ Tech Stack

- **CodeMirror 5** (core editor)
- **Prettier** (code formatting)
- **JSZip** (ZIP export)
- **Font Awesome**
- Vanilla JavaScript (no frameworks)

---

## 📁 Project Structure
    Agg-Editor/
    ├── index.html          # Main HTML file
    ├── app.js              # All application logic
    ├── Custom.css          # Custom styling
    └── README.md

▶️ Getting Started

- Download or clone this repository
- Open the index.html file in your browser (Chrome, Edge, or Opera recommended)
- Start coding immediately — no installation needed!

Tip: For best experience and full File System Access support, use Google Chrome or Microsoft Edge.

⌨️ Keyboard Shortcuts
  
  Save file = Ctrl + S
  Find / Replace = Ctrl + H
  New file = Ctrl + N
  Format code = Alt + F
  Toggle Sidebar = Ctrl + B
  Zoom In = Ctrl + +
  Zoom Out = Ctrl + -
  Toggle Comment = Ctrl + /
  Emmet Expand = Tab (in HTML/CSS)

📦 Export Options

  - Export current file (Download)
  - Export entire project as ZIP
  - Save directly to folder (using File System Access API)

⚠️ Notes

  - This is a 100% client-side application (no backend required)
  - Files are saved in browser localStorage by default
  - Full File System integration works best in Chromium-based browsers
  - Live preview is optimized for HTML, CSS, and JavaScript

💡 Future Improvements (Planned)

  - Real-time collaboration
  - Git integration
  - Built-in terminal
  - Plugin system
  - One-click deployment

👨‍💻 Author
Built as a lightweight in-browser IDE for quick prototyping and development.

📜 License
This project is licensed under the MIT License — feel free to use, modify, and distribute.

Made with ❤️ for fast and simple web development

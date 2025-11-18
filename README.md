# 🏛️ Note Vault

Note Vault is a standalone, **Electron-based** desktop application for managing technical inspection notes. It allows you to create detailed reports with images, crop them for precision, and organize data into separate profiles.

It is designed for QA, manufacturing, or engineering workflows where data privacy is paramount. It runs entirely offline using **IndexedDB** for storage and the local file system for backups.

---

## ✨ Features

* **🔒 Offline & Private:** Data is stored locally in `IndexedDB`. No cloud servers, no internet connection required.
* **👤 Profile Management:** Create, switch, and delete multiple profiles (e.g., "Jason", "Project A") to keep different datasets organized.
* **📄 PDF Export:** Native integration to print nicely formatted notes to PDF.
* **💾 Import / Export:** Backup your entire profile to a JSON file or transfer data between machines.
* **🖼️ Advanced Image Tools:**
    * **Smart Compression:** Images are automatically compressed on upload to optimize storage.
    * **Precision Cropper:** Built-in 1:1 cropper with zoom, pan, and persistent crop settings (remembers your crop if you edit it again).
* **⚡ Three-Panel Layout:**
    * **List:** Browse notes with live-preview thumbnails and **real-time filtering by Part ID**.
    * **Viewer:** Large, read-only view for inspection.
    * **Editor:** Full control over text, images, and captions.

---

## 🛠️ Tech Stack

* **Framework:** [Electron](https://www.electronjs.org/) (Desktop Wrapper)
* **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+)
* **Storage:** IndexedDB (Client-side database)
* **Styling:** CSS Variables, Grid, and Flexbox (Dark Mode)

---

## 🚀 How to Install & Run

Because this app uses Electron for system access (PDFs, File System), you need Node.js installed.

### 1. Prerequisites & Dependencies
* **System Requirement:** [Node.js](https://nodejs.org/) (LTS version recommended). This includes **npm**.
* **Project Dependencies:**
    * `electron` (^28.0.0): The only package required. It wraps the HTML/JS in a desktop window.

### 2. Installation
Clone the repository and install the dependencies automatically:

```bash
# Clone the repo
git clone [https://github.com/webdev-jason/Note-Vault.git](https://github.com/webdev-jason/Note-Vault.git)

# Go into the app folder
cd Note-Vault

# Install Electron via npm
npm install
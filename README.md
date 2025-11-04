# 🏛️ Note Vault

![Built with Vanilla JS](https://img.shields.io/badge/Built%20with-Vanilla%20JS-F7DF1E?logo=javascript&logoColor=black)

Note Vault is a standalone, browser-based application for managing technical inspection notes. It's built purely with vanilla HTML, CSS, and JavaScript and uses **IndexedDB** to store all data locally in your browser.

It's designed for QA, manufacturing, or engineering workflows where you need to attach multiple images, captions, and details to a specific Part ID.

![Note Vault Interface](httpsPlease_add_your_screenshot.png)
*(Note: You should replace the `Please_add_your_screenshot.png` link with a real screenshot of your app)*

---

## ✨ Features

* **Offline First:** All notes and images are saved locally in your browser's **IndexedDB**. No server or internet connection is required.
* **Data Migration:** Automatically migrates old data from `localStorage` (and old multi-page formats) to the new IndexedDB database.
* **Three-Panel Layout:**
    * **List Panel:** Browse all notes, sorted alphabetically, with a live-preview thumbnail.
    * **View Panel:** A clean, large-font viewer for the selected note.
    * **Edit Panel:** Modify the Part ID, inspection notes, and images.
* **Dynamic Thumbnail Preview:** The note list features a live-rendering, 8.5"x11" aspect ratio preview of the note's content, with a dynamically resizing Part ID overlay.
* **Rich Note Editing:** Create notes with a unique Part ID, a single scrollable text body, and multiple images.
* **Image Uploader:**
    * Add multiple images to any note.
    * Automatic image compression on upload to save storage space.
* **Custom Image Cropper:**
    * Built-in 1:1 cropper for focusing on important details.
    * Supports mouse, wheel, and keyboard controls for precision.
* **Focused View:** An "Expand Note" button hides the list and editor panels for a clean, readable view.
* **Clean, Modern UI:** A custom dark theme with translucent scrollbars and responsive layouts.

---

## 🛠️ Tech Stack

* **HTML5**
* **CSS3** (using Flexbox, Grid, and CSS Variables)
* **Vanilla JavaScript (ES6+)**
    * No frameworks or libraries.
    * Asynchronous (async/await) functions.
    * DOM manipulation.
* **IndexedDB:** For all client-side database storage.

---

## 🚀 How to Use

There is no build step required. Simply open the `index.html` file in any modern web browser.

1.  Clone this repository:
    ```sh
    git clone [https://github.com/YOUR_USERNAME/note-vault.git](https://github.com/YOUR_USERNAME/note-vault.git)
    ```
2.  Navigate to the directory:
    ```sh
    cd note-vault
    ```
3.  Open the `index.html` file directly in your browser (e.g., Chrome, Firefox, Edge).

    (Optional) For the best experience, run it with a local web server, such as the **Live Server** extension in VS Code.

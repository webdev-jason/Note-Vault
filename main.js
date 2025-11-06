const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow () {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1400, // A good default size
    height: 1000,
    webPreferences: {
      // These two settings are crucial for your existing
      // app.js code to work inside the Electron window
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // and load the index.html of the app.
  win.loadFile('index.html');

  // You can uncomment this line to open the Chrome DevTools
  // win.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
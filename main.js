const { app, BrowserWindow, ipcMain, dialog } = require('electron'); // Added ipcMain, dialog
const path = require('path');
const fs = require('fs'); // Added fs

function createWindow () {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
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

// --- NEW PDF PRINTING LOGIC ---
ipcMain.on('print-to-pdf', (event, partId) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const safePartId = (partId || 'note').replace(/[^a-z0-9]/gi, '_');

  dialog.showSaveDialog(win, {
    title: 'Save Note as PDF',
    defaultPath: `${safePartId}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  }).then(result => {
    if (result.canceled || !result.filePath) {
      return; // User cancelled
    }

    const pdfPath = result.filePath;
    
    // Options for PDF generation
    const options = {
      marginsType: 1, // 0 = default, 1 = none, 2 = min
      pageSize: 'Letter',
      printBackground: true,
      landscape: false
    };

    // Hide the floating "Expand Note" button before printing
    win.webContents.executeJavaScript(`
      document.getElementById('expandBtn').style.visibility = 'hidden';
      document.getElementById('printBtn').style.visibility = 'hidden';
    `).then(() => {
      // Run the PDF generation
      win.webContents.printToPDF(options).then(data => {
        fs.writeFile(pdfPath, data, (error) => {
          if (error) {
            console.error('Failed to write PDF:', error);
            dialog.showErrorBox('Save PDF Error', 'Failed to save the PDF file.');
          }
          
          // Show the buttons again after it's done
          win.webContents.executeJavaScript(`
            document.getElementById('expandBtn').style.visibility = 'visible';
            document.getElementById('printBtn').style.visibility = 'visible';
          `);
        });
      }).catch(error => {
        console.error('Failed to print PDF:', error);
        dialog.showErrorBox('Print PDF Error', 'Failed to generate the PDF.');
        // Show the buttons again even if it fails
        win.webContents.executeJavaScript(`
          document.getElementById('expandBtn').style.visibility = 'visible';
          document.getElementById('printBtn').style.visibility = 'visible';
        `);
      });
    });

  }).catch(err => {
    console.error('Save dialog error:', err);
  });
});
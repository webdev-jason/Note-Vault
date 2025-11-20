const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// --- FORCE SYSTEM DATA PATH (Hide DB in AppData) ---
const appName = 'Note Vault';
app.setPath('userData', path.join(app.getPath('appData'), appName));

function createWindow () {
  const win = new BrowserWindow({
    width: 1400,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- PDF PRINTING LOGIC ---
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
      return; 
    }

    const pdfPath = result.filePath;
    
    const options = {
      marginsType: 1, 
      pageSize: 'Letter',
      printBackground: false, 
      landscape: false
    };

    // --- TOGGLE LOADING UI (New Event-Based Logic) ---
    // Tell renderer to show loader
    event.sender.send('pdf-export-started');

    // Delay slightly to ensure UI updates
    setTimeout(() => {
      win.webContents.printToPDF(options).then(data => {
        fs.writeFile(pdfPath, data, (error) => {
          if (error) {
            console.error('Failed to write PDF:', error);
            dialog.showErrorBox('Save PDF Error', 'Failed to save the PDF file.');
          }
          // Tell renderer to hide loader
          event.sender.send('pdf-export-complete');
        });
      }).catch(error => {
        console.error('Failed to print PDF:', error);
        dialog.showErrorBox('Print PDF Error', 'Failed to generate the PDF.');
        // Tell renderer to hide loader on error
        event.sender.send('pdf-export-complete');
      });
    }, 500); 

  }).catch(err => {
    console.error('Save dialog error:', err);
  });
});

// --- EXPORT/IMPORT LOGIC ---

// 1. Handle Export Profile
ipcMain.on('export-data', (event, notesData, filename) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  // Use the provided filename, or fallback to a generic default
  const defaultName = filename || 'note-vault-profile.json';

  dialog.showSaveDialog(win, {
    title: 'Export Profile',
    defaultPath: defaultName,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  }).then(result => {
    if (result.canceled || !result.filePath) {
      return;
    }
    
    const jsonContent = JSON.stringify(notesData, null, 2); 
    
    fs.writeFile(result.filePath, jsonContent, (error) => {
      if (error) {
        dialog.showErrorBox('Export Error', 'Failed to save profile file.');
      } else {
        dialog.showMessageBox(win, {
          title: 'Export Successful',
          message: 'Your profile has been exported successfully.'
        });
      }
    });
  });
});

// 2. Handle Import Profile
ipcMain.on('import-data', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  dialog.showOpenDialog(win, {
    title: 'Import Profile',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  }).then(result => {
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return;
    }

    const filePath = result.filePaths[0];
    fs.readFile(filePath, 'utf-8', (error, data) => {
      if (error) {
        dialog.showErrorBox('Import Error', 'Failed to read profile file.');
        return;
      }
      event.sender.send('data-loaded', data);
    });
  });
});
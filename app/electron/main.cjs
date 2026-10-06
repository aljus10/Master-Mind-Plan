const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

app.setName('Master Mind Plan');

// Determine storage path: %APPDATA%/Master Mind Plan/workspace.json
function getDataFilePath() {
  const appDataDir = path.join(app.getPath('appData'), 'Master Mind Plan');
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }
  return path.join(appDataDir, 'workspace.json');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 850,
    minHeight: 560,
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    title: 'Master Mind Plan',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (process.env.USE_DEV_SERVER) {
    mainWindow.loadURL('http://localhost:5173');
  } else if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  // Open external links in default browser instead of Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Synchronous initial workspace load for instant React startup
ipcMain.on('storage:load-sync', (event) => {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      event.returnValue = data;
      return;
    }
  } catch (err) {
    console.error('[Electron] Error reading workspace file:', err);
  }
  event.returnValue = null;
});

// Asynchronous save to physical hard drive
ipcMain.handle('storage:save', async (_event, serializedData) => {
  try {
    const filePath = getDataFilePath();
    fs.writeFileSync(filePath, serializedData, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('[Electron] Error saving workspace file:', err);
    return { success: false, error: err.message };
  }
});

// Reveal data folder in Windows File Explorer
ipcMain.handle('storage:reveal', async () => {
  const filePath = getDataFilePath();
  shell.showItemInFolder(filePath);
  return true;
});

// Reveal data folder path string
ipcMain.handle('storage:get-path', async () => {
  return getDataFilePath();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const { app, BrowserWindow, dialog, ipcMain, shell, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const Store = require('electron-store').default;
const { imageSize } = require('image-size');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const defaultTargetDirectory = app.getPath('desktop');

const store = new Store({
  name: 'pixellocallens-desktop',
  defaults: {
    targetDirectory: defaultTargetDirectory
  }
});

function getStoredTargetDirectory() {
  const storedTargetDirectory = store.get('targetDirectory');

  if (typeof storedTargetDirectory === 'string' && storedTargetDirectory.trim().length > 0) {
    return storedTargetDirectory;
  }

  store.set('targetDirectory', defaultTargetDirectory);
  return defaultTargetDirectory;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1120,
    minHeight: 760,
    backgroundColor: '#eef2ff',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    window.loadURL(devServerUrl);
    window.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

async function scanDirectoryRecursive(rootDirectory, currentDirectory = rootDirectory) {
  const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDirectory, entry.name);

    if (entry.isDirectory()) {
      const nested = await scanDirectoryRecursive(rootDirectory, fullPath);
      files.push(...nested);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) {
      continue;
    }

    const stats = await fs.stat(fullPath);
    const metadata = {
      name: entry.name,
      extension: extension.replace('.', '').toUpperCase(),
      size: stats.size,
      lastModified: stats.mtimeMs,
      fullPath,
      relativePath: path.relative(rootDirectory, fullPath),
      previewUrl: pathToFileURL(fullPath).href
    };

    try {
      const imageBuffer = await fs.readFile(fullPath);
      const dimensions = imageSize(imageBuffer);
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
    } catch (_error) {
      metadata.width = undefined;
      metadata.height = undefined;
    }

    files.push(metadata);
  }

  return files;
}

async function openFolderDialog() {
  const window = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(window, {
    title: 'Taranacak klasörü seçin',
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('Klasör seçimi iptal edildi.');
  }

  const selectedDirectory = result.filePaths[0];
  const files = await scanDirectoryRecursive(selectedDirectory);

  files.sort((left, right) => left.name.localeCompare(right.name, 'tr'));

  return {
    name: path.basename(selectedDirectory),
    rootPath: selectedDirectory,
    files
  };
}

async function requestTargetDirectory() {
  const window = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(window, {
    title: 'Kaydedilecek hedef klasörü seçin',
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('Hedef klasör seçimi iptal edildi.');
  }

  const targetDirectory = result.filePaths[0];
  store.set('targetDirectory', targetDirectory);
  return targetDirectory;
}

ipcMain.handle('media:open-folder', async () => openFolderDialog());

ipcMain.handle('media:copy-file', async (_event, payload) => {
  const sourcePath = payload?.fullPath;
  const fileName = payload?.fileName;

  if (!sourcePath || !fileName) {
    throw new Error('Kopyalanacak dosya bilgisi eksik.');
  }

  const targetDirectory = getStoredTargetDirectory();
  const destinationPath = path.join(targetDirectory, fileName);
  await fs.copyFile(sourcePath, destinationPath);

  return {
    destinationPath,
    targetDirectory
  };
});

ipcMain.handle('media:change-target-directory', async () => {
  const targetDirectory = await requestTargetDirectory();
  return { targetDirectory };
});

ipcMain.handle('media:get-target-directory', async () => {
  return { targetDirectory: getStoredTargetDirectory() };
});

ipcMain.handle('media:open-in-explorer', async (_event, payload) => {
  const fullPath = payload?.fullPath;
  if (!fullPath) {
    throw new Error('Dosya yolu eksik.');
  }

  await shell.showItemInFolder(fullPath);
  return { ok: true };
});

ipcMain.handle('media:get-preview-data-url', async (_event, payload) => {
  const fullPath = payload?.fullPath;
  const maxSize = payload?.maxSize ?? 1200;

  if (!fullPath) {
    throw new Error('Önizleme için dosya yolu eksik.');
  }

  const image = nativeImage.createFromPath(fullPath);
  if (image.isEmpty()) {
    throw new Error('Görsel önizlemesi oluşturulamadı.');
  }

  const size = image.getSize();
  const longestEdge = Math.max(size.width, size.height);

  if (longestEdge <= maxSize) {
    return { dataUrl: image.toDataURL() };
  }

  const scale = maxSize / longestEdge;
  const resized = image.resize({
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale))
  });

  return { dataUrl: resized.toDataURL() };
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

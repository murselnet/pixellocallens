const { app, BrowserWindow, dialog, ipcMain, shell, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const Store = require('electron-store').default;
const { autoUpdater } = require('electron-updater');
const { imageSize } = require('image-size');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const defaultTargetDirectory = app.getPath('desktop');
const windowIconPath = path.join(__dirname, '..', 'build', 'icon.png');
const isDevelopment = !app.isPackaged;
let mainWindow = null;
let updateDownloaded = false;
let updateCheckInFlight = false;
let lastUpdateCheckSource = 'background';

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
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 960,
    minWidth: 1120,
    minHeight: 760,
    backgroundColor: '#eef2ff',
    autoHideMenuBar: true,
    icon: windowIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

function sendUpdateStatus(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('app:update-status', payload);
}

function setUpdateCheckState(isInFlight) {
  updateCheckInFlight = isInFlight;
}

async function promptForUpdateInstall(version) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['Simdi yeniden baslat', 'Daha sonra'],
    defaultId: 0,
    cancelId: 1,
    title: 'Guncelleme hazir',
    message: `PixelLocalLens ${version} indirildi.`,
    detail: 'Guncellemeyi kurmak icin uygulamayi simdi yeniden baslatabilirsiniz.'
  });

  if (result.response === 0) {
    autoUpdater.quitAndInstall();
  }
}

function configureAutoUpdater() {
  if (isDevelopment) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({
      status: 'checking',
      message: 'Guncellemeler kontrol ediliyor.',
      source: lastUpdateCheckSource
    });
  });

  autoUpdater.on('update-available', (info) => {
    setUpdateCheckState(false);
    sendUpdateStatus({
      status: 'available',
      message: `Yeni surum bulundu: v${info.version}. Indiriliyor...`,
      version: info.version,
      source: lastUpdateCheckSource
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    setUpdateCheckState(false);
    sendUpdateStatus({
      status: 'not-available',
      message: `Uygulama guncel. Surum: v${info.version}.`,
      version: info.version,
      source: lastUpdateCheckSource
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      status: 'downloading',
      message: `Guncelleme indiriliyor... %${Math.round(progress.percent)}`,
      progress: progress.percent,
      source: lastUpdateCheckSource
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateCheckState(false);
    updateDownloaded = true;
    sendUpdateStatus({
      status: 'downloaded',
      message: `v${info.version} indirildi. Uygulamayi yeniden baslatarak kurulumu tamamlayabilirsiniz.`,
      version: info.version,
      source: lastUpdateCheckSource
    });
    void promptForUpdateInstall(info.version);
  });

  autoUpdater.on('error', (error) => {
    setUpdateCheckState(false);
    sendUpdateStatus({
      status: 'error',
      message: error?.message || 'Guncelleme sirasinda beklenmeyen bir hata olustu.',
      source: lastUpdateCheckSource
    });
  });
}

async function checkForUpdates(source = 'manual') {
  if (isDevelopment) {
    sendUpdateStatus({
      status: 'dev-mode',
      message: 'Guncelleme denetimi gelistirme modunda kapali.',
      source
    });
    return { started: false, reason: 'dev-mode' };
  }

  if (updateCheckInFlight) {
    return { started: false, reason: 'busy' };
  }

  setUpdateCheckState(true);
  updateDownloaded = false;
  lastUpdateCheckSource = source;
  sendUpdateStatus({
    status: 'checking',
    message: 'Guncellemeler kontrol ediliyor.',
    source
  });

  try {
    await autoUpdater.checkForUpdates();
    return { started: true };
  } catch (error) {
    setUpdateCheckState(false);
    sendUpdateStatus({
      status: 'error',
      message: error?.message || 'Guncelleme kontrolu basarisiz oldu.',
      source
    });
    throw error;
  }
}

async function installUpdateNow() {
  if (!updateDownloaded) {
    return { ok: false };
  }

  autoUpdater.quitAndInstall();
  return { ok: true };
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

ipcMain.handle('app:get-version', async () => {
  return { version: app.getVersion() };
});

ipcMain.handle('app:check-for-updates', async () => {
  return checkForUpdates('manual');
});

ipcMain.handle('app:install-update-now', async () => {
  return installUpdateNow();
});

app.whenReady().then(() => {
  app.setAppUserModelId('com.projehub.pixellocallens.desktop');
  configureAutoUpdater();
  createWindow();

  if (!isDevelopment) {
    setTimeout(() => {
      void checkForUpdates('background').catch(() => {});
    }, 5000);
  }

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

app.on('browser-window-created', (_event, window) => {
  mainWindow = window;
});

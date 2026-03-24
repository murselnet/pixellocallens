import { FileMetadata } from '../types';

export class FileSystemService {
  private static readonly SUPPORTED_IMAGES = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  private static readonly HANDLE_DB_NAME = 'pixellocallens-handles';
  private static readonly HANDLE_STORE_NAME = 'directories';
  private static readonly TARGET_DIR_KEY = 'download-target';

  static isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  static isImageFile(file: FileMetadata): boolean {
    return this.SUPPORTED_IMAGES.includes(file.extension.toLowerCase());
  }

  private static sortFiles(files: FileMetadata[]): FileMetadata[] {
    return files.sort((a, b) => {
      const isAImage = this.isImageFile(a);
      const isBImage = this.isImageFile(b);

      if (isAImage && !isBImage) return -1;
      if (!isAImage && isBImage) return 1;

      return a.name.localeCompare(b.name, 'tr');
    });
  }

  static async openDirectory(): Promise<{ name: string; files: FileMetadata[] }> {
    try {
      const dirHandle = await (window as unknown as { showDirectoryPicker: Function }).showDirectoryPicker({
        mode: 'readwrite'
      });

      const files = await this.readDirectoryRecursive(dirHandle);

      return {
        name: dirHandle.name,
        files: this.sortFiles(files)
      };
    } catch (err: any) {
      if (err.name === 'SecurityError' || String(err.message).includes('sub frames')) {
        console.warn('Modern API engellendi, yedek yonteme geciliyor...');
        return this.openDirectoryFallback();
      }

      if (err.name === 'AbortError') {
        throw new Error('Klasor secimi iptal edildi.');
      }

      throw err;
    }
  }

  private static async readDirectoryRecursive(
    dirHandle: FileSystemDirectoryHandle,
    basePath = ''
  ): Promise<FileMetadata[]> {
    const files: FileMetadata[] = [];

    const iterableHandle = dirHandle as any;

    for await (const entry of iterableHandle.values()) {
      const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.kind === 'directory') {
        const nestedFiles = await this.readDirectoryRecursive(entry, entryPath);
        files.push(...nestedFiles);
        continue;
      }

      const file = await entry.getFile();
      const metadata = await this.processFile(file, entryPath);
      if (metadata) {
        files.push(metadata);
      }
    }

    return files;
  }

  private static openDirectoryFallback(): Promise<{ name: string; files: FileMetadata[] }> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      (input as HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean }).webkitdirectory = true;
      (input as HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean }).directory = true;

      input.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const selectedFiles = target.files;

        if (!selectedFiles || selectedFiles.length === 0) {
          reject(new Error('Klasor secilmedi.'));
          return;
        }

        const files: FileMetadata[] = [];
        const firstPath = (selectedFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '';
        const folderName = firstPath.split('/')[0] || 'Secilen Klasor';

        for (let index = 0; index < selectedFiles.length; index += 1) {
          const file = selectedFiles[index] as File & { webkitRelativePath?: string };
          const metadata = await this.processFile(file, file.webkitRelativePath || file.name);
          if (metadata) {
            files.push(metadata);
          }
        }

        resolve({
          name: folderName,
          files: this.sortFiles(files)
        });
      };

      input.oncancel = () => reject(new Error('Klasor secimi iptal edildi.'));
      input.click();
    });
  }

  private static async processFile(file: File, relativePath: string): Promise<FileMetadata | null> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!this.SUPPORTED_IMAGES.includes(ext)) {
      return null;
    }

    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: ext.toUpperCase(),
      lastModified: file.lastModified,
      previewUrl: URL.createObjectURL(file),
      relativePath
    };

    try {
      const dimensions = await this.getImageDimensions(metadata.previewUrl);
      metadata.width = dimensions.width;
      metadata.height = dimensions.height;
    } catch {
      console.warn(`Boyut alinamadi: ${file.name}`);
    }

    return metadata;
  }

  private static getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
    });
  }

  static releaseFiles(files: FileMetadata[]): void {
    files.forEach((file) => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
  }

  private static openHandleDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.HANDLE_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.HANDLE_STORE_NAME)) {
          db.createObjectStore(this.HANDLE_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private static async saveTargetDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    const db = await this.openHandleDb();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.HANDLE_STORE_NAME, 'readwrite');
      tx.objectStore(this.HANDLE_STORE_NAME).put(handle, this.TARGET_DIR_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    db.close();
  }

  private static async getSavedTargetDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
    const db = await this.openHandleDb();

    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(this.HANDLE_STORE_NAME, 'readonly');
      const request = tx.objectStore(this.HANDLE_STORE_NAME).get(this.TARGET_DIR_KEY);
      request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return handle;
  }

  private static async requestDirectoryPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    const readWriteMode = { mode: 'readwrite' as const };
    const permissionHandle = handle as any;

    if ((await permissionHandle.queryPermission(readWriteMode)) === 'granted') {
      return true;
    }

    return (await permissionHandle.requestPermission(readWriteMode)) === 'granted';
  }

  private static async getTargetDirectoryHandle(): Promise<FileSystemDirectoryHandle> {
    const savedHandle = await this.getSavedTargetDirectoryHandle();

    if (savedHandle && (await this.requestDirectoryPermission(savedHandle))) {
      return savedHandle;
    }

    const targetDirHandle = await (window as unknown as { showDirectoryPicker: Function }).showDirectoryPicker({
      mode: 'readwrite'
    });

    await this.saveTargetDirectoryHandle(targetDirHandle);
    return targetDirHandle;
  }

  static async copyFileToFolder(fileName: string, blobUrl: string): Promise<void> {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();

      if (this.isSupported()) {
        try {
          const targetDirHandle = await this.getTargetDirectoryHandle();
          const newFileHandle = await targetDirHandle.getFileHandle(fileName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch {
          console.warn('Modern kaydetme basarisiz, indirme yontemine geciliyor.');
        }
      }

      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fileName;
      anchor.click();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }

      throw new Error(`Islem basarisiz: ${err.message}`);
    }
  }

  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const kiloByte = 1024;
    const precision = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(kiloByte));

    return `${parseFloat((bytes / Math.pow(kiloByte, unitIndex)).toFixed(precision))} ${sizes[unitIndex]}`;
  }

  static formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('tr-TR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(timestamp);
  }
}

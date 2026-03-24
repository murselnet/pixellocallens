
import { FileMetadata } from '../types';

/**
 * World-class service for local file system operations.
 * Handles both modern File System Access API and legacy fallback for framed environments.
 */
export class FileSystemService {
  private static readonly SUPPORTED_IMAGES = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  private static readonly SUPPORTED_TEXT = ['txt', 'md', 'json'];
  private static readonly HANDLE_DB_NAME = 'pixellocallens-handles';
  private static readonly HANDLE_STORE_NAME = 'directories';
  private static readonly TARGET_DIR_KEY = 'download-target';

  /**
   * Tarayıcının modern API'yi destekleyip desteklemediğini kontrol eder.
   */
  static isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Dosyaları önce görsellere göre, sonra isme göre sıralar.
   */
  private static sortFiles(files: FileMetadata[]): FileMetadata[] {
    return files.sort((a, b) => {
      const isAImage = this.SUPPORTED_IMAGES.includes(a.extension.toLowerCase());
      const isBImage = this.SUPPORTED_IMAGES.includes(b.extension.toLowerCase());

      // Eğer biri görsel diğeri değilse, görsel olan üstte çıkar
      if (isAImage && !isBImage) return -1;
      if (!isAImage && isBImage) return 1;

      // Aynı türdelerse alfabetik sırala
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Modern API (showDirectoryPicker) veya Fallback (input) kullanarak klasör açar.
   */
  static async openDirectory(): Promise<{ name: string; files: FileMetadata[] }> {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      
      const files: FileMetadata[] = [];

      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const metadata = await this.processFile(file, this.SUPPORTED_IMAGES, this.SUPPORTED_TEXT);
          if (metadata) files.push(metadata);
        }
      }

      return {
        name: dirHandle.name,
        files: this.sortFiles(files)
      };
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.message.includes('sub frames')) {
        console.warn("Modern API engellendi, yedek yönteme (input) geçiliyor...");
        return this.openDirectoryFallback();
      }
      
      if (err.name === 'AbortError') {
        throw new Error('Klasör seçimi iptal edildi.');
      }
      throw err;
    }
  }

  /**
   * Yedek yöntem: Gizli bir input elementi kullanarak klasör seçimi.
   */
  private static openDirectoryFallback(): Promise<{ name: string; files: FileMetadata[] }> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      (input as any).directory = true;

      input.onchange = async (e: any) => {
        const selectedFiles: FileList = e.target.files;
        if (!selectedFiles || selectedFiles.length === 0) {
          reject(new Error('Klasör seçilmedi.'));
          return;
        }

        const files: FileMetadata[] = [];
        const folderName = selectedFiles[0].webkitRelativePath.split('/')[0] || 'Seçilen Klasör';

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const metadata = await this.processFile(file, this.SUPPORTED_IMAGES, this.SUPPORTED_TEXT);
          if (metadata) files.push(metadata);
        }

        resolve({
          name: folderName,
          files: this.sortFiles(files)
        });
      };

      input.oncancel = () => reject(new Error('Klasör seçimi iptal edildi.'));
      input.click();
    });
  }

  /**
   * Dosyayı işleyip meta verilerini çıkaran ortak fonksiyon.
   */
  private static async processFile(file: File, supportedImages: string[], supportedText: string[]): Promise<FileMetadata | null> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (supportedImages.includes(ext) || supportedText.includes(ext)) {
      const metadata: FileMetadata = {
        name: file.name,
        size: file.size,
        type: file.type,
        extension: ext.toUpperCase(),
        lastModified: file.lastModified,
        previewUrl: URL.createObjectURL(file)
      };

      if (supportedImages.includes(ext)) {
        try {
          const dimensions = await this.getImageDimensions(metadata.previewUrl);
          metadata.width = dimensions.width;
          metadata.height = dimensions.height;
        } catch (e) {
          console.warn(`Boyut alınamadı: ${file.name}`);
        }
      }
      return metadata;
    }
    return null;
  }

  private static getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
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

    if (savedHandle && await this.requestDirectoryPermission(savedHandle)) {
      return savedHandle;
    }

    const targetDirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
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
        } catch (e) {
          console.warn("Modern kopyalama başarısız, indirme yöntemine geçiliyor.");
        }
      }

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.click();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      throw new Error(`İşlem başarısız: ${err.message}`);
    }
  }

  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

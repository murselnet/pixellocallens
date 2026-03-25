import { FileMetadata, FolderData, UpdateStatusPayload } from '../types';

declare global {
  interface Window {
    desktopApi: {
      openFolder: () => Promise<FolderData>;
      copyFile: (file: { fullPath: string; fileName: string }) => Promise<{ destinationPath: string; targetDirectory: string }>;
      changeTargetDirectory: () => Promise<{ targetDirectory: string }>;
      getTargetDirectory: () => Promise<{ targetDirectory: string | null }>;
      openInExplorer: (file: { fullPath: string }) => Promise<{ ok: true }>;
      getPreviewDataUrl: (file: { fullPath: string; maxSize?: number }) => Promise<{ dataUrl: string }>;
      getAppVersion: () => Promise<{ version: string }>;
      checkForUpdates: () => Promise<{ started: boolean; reason?: string }>;
      installUpdateNow: () => Promise<{ ok: boolean }>;
      onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => () => void;
    };
  }
}

export const desktopApi = {
  openFolder(): Promise<FolderData> {
    return window.desktopApi.openFolder();
  },
  copyFile(file: FileMetadata): Promise<{ destinationPath: string; targetDirectory: string }> {
    return window.desktopApi.copyFile({ fullPath: file.fullPath, fileName: file.name });
  },
  changeTargetDirectory(): Promise<{ targetDirectory: string }> {
    return window.desktopApi.changeTargetDirectory();
  },
  getTargetDirectory(): Promise<{ targetDirectory: string | null }> {
    return window.desktopApi.getTargetDirectory();
  },
  openInExplorer(file: FileMetadata): Promise<{ ok: true }> {
    return window.desktopApi.openInExplorer({ fullPath: file.fullPath });
  },
  getPreviewDataUrl(fullPath: string, maxSize?: number): Promise<{ dataUrl: string }> {
    return window.desktopApi.getPreviewDataUrl({ fullPath, maxSize });
  },
  getAppVersion(): Promise<{ version: string }> {
    return window.desktopApi.getAppVersion();
  },
  checkForUpdates(): Promise<{ started: boolean; reason?: string }> {
    return window.desktopApi.checkForUpdates();
  },
  installUpdateNow(): Promise<{ ok: boolean }> {
    return window.desktopApi.installUpdateNow();
  },
  onUpdateStatus(callback: (payload: UpdateStatusPayload) => void): () => void {
    return window.desktopApi.onUpdateStatus(callback);
  },
  isAvailable(): boolean {
    return typeof window.desktopApi !== 'undefined';
  }
};

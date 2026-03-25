import { CopyRules, FileMetadata, FolderData, UpdateStatusPayload } from '../types';

declare global {
  interface Window {
    desktopApi: {
      openFolder: () => Promise<FolderData>;
      copyFile: (file: {
        fullPath: string;
        fileName: string;
        width?: number;
        height?: number;
        extension: string;
        lastModified: number;
        rules: CopyRules;
      }) => Promise<{ destinationPath: string; targetDirectory: string; skipped?: boolean }>;
      changeTargetDirectory: () => Promise<{ targetDirectory: string }>;
      getTargetDirectory: () => Promise<{ targetDirectory: string | null }>;
      openInExplorer: (file: { fullPath: string }) => Promise<{ ok: true }>;
      getPreviewDataUrl: (file: { fullPath: string; maxSize?: number }) => Promise<{ dataUrl: string }>;
      getAppVersion: () => Promise<{ version: string }>;
      checkForUpdates: () => Promise<{ started: boolean; reason?: string }>;
      downloadAndInstallUpdate: () => Promise<{ started: boolean; reason?: string }>;
      installUpdateNow: () => Promise<{ ok: boolean }>;
      onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => () => void;
    };
  }
}

export const desktopApi = {
  openFolder(): Promise<FolderData> {
    return window.desktopApi.openFolder();
  },
  copyFile(file: FileMetadata, rules: CopyRules): Promise<{ destinationPath: string; targetDirectory: string; skipped?: boolean }> {
    return window.desktopApi.copyFile({
      fullPath: file.fullPath,
      fileName: file.name,
      width: file.width,
      height: file.height,
      extension: file.extension,
      lastModified: file.lastModified,
      rules
    });
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
  downloadAndInstallUpdate(): Promise<{ started: boolean; reason?: string }> {
    return window.desktopApi.downloadAndInstallUpdate();
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

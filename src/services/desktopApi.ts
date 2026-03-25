import { FileMetadata, FolderData } from '../types';

declare global {
  interface Window {
    desktopApi: {
      openFolder: () => Promise<FolderData>;
      copyFile: (file: { fullPath: string; fileName: string }) => Promise<{ destinationPath: string; targetDirectory: string }>;
      changeTargetDirectory: () => Promise<{ targetDirectory: string }>;
      getTargetDirectory: () => Promise<{ targetDirectory: string | null }>;
      openInExplorer: (file: { fullPath: string }) => Promise<{ ok: true }>;
      getPreviewDataUrl: (file: { fullPath: string; maxSize?: number }) => Promise<{ dataUrl: string }>;
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
  isAvailable(): boolean {
    return typeof window.desktopApi !== 'undefined';
  }
};

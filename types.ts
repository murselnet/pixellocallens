
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  extension: string;
  lastModified: number;
  width?: number;
  height?: number;
  previewUrl: string;
}

export interface FolderData {
  name: string;
  files: FileMetadata[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  LOADED = 'LOADED',
  ERROR = 'ERROR'
}

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

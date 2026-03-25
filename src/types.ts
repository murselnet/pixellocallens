export interface FileMetadata {
  name: string;
  extension: string;
  size: number;
  lastModified: number;
  fullPath: string;
  relativePath: string;
  previewUrl: string;
  width?: number;
  height?: number;
  duplicateGroupKey?: string;
  duplicateCount?: number;
}

export interface FolderData {
  name: string;
  rootPath: string;
  files: FileMetadata[];
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface UpdateStatusPayload {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | 'dev-mode';
  message: string;
  version?: string;
  progress?: number;
  source?: 'manual' | 'background';
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  LOADED = 'LOADED'
}

export type SortOption = 'resolution' | 'name' | 'size' | 'modified';
export type OrientationFilter = 'all' | 'landscape' | 'portrait' | 'square';
export type DuplicateFilter = 'all' | 'duplicates' | 'unique';
export type CopyGroupingRule = 'none' | 'resolution' | 'extension' | 'date';
export type CopyConflictRule = 'rename' | 'overwrite' | 'skip';

export interface CopyRules {
  grouping: CopyGroupingRule;
  conflict: CopyConflictRule;
}

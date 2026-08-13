// Global Electron API exposed via preload.js
export interface ElectronWindowControls {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  platform: string;
  isMaximized: () => Promise<boolean>;
}

export interface UpdaterState {
  available: boolean;
  version: string | null;
  releaseNotes: string | null;
  downloaded: boolean;
  progress: number;
  error: string | null;
}

export interface ElectronUpdaterAPI {
  check: () => Promise<{ status: string; error?: string }>;
  download: () => Promise<{ status: string; error?: string }>;
  quitAndInstall: () => Promise<void>;
  getState: () => Promise<UpdaterState>;
  onState: (callback: (state: UpdaterState) => void) => () => void;
}

export interface ElectronAPI {
  notify: (title: string, body: string) => void;
  /** Open the OS-level privacy/settings page for the given device kind. */
  openDeviceSettings: (kind: 'microphone' | 'camera') => Promise<string | null>;
  flashFrame: () => void;
  openExternal: (url: string) => void;
  onFocusChange: (callback: (focused: boolean) => void) => void;
  onMaximizeChange: (callback: (maximized: boolean) => void) => void;
  windowControls: ElectronWindowControls;
  screenCapture: {
    getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>;
    select: (sourceId: string) => Promise<boolean>;
    cancel: () => Promise<void>;
    onRequest: (handler: () => void) => () => void;
    capture?: (sourceId: string) => Promise<any>;
  };
  updater: ElectronUpdaterAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    __VOX_CONFIG?: { apiBase?: string };
  }
}

export {};

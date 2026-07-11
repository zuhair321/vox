// Global Electron API exposed via preload.js
export interface ElectronWindowControls {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  platform: string;
  isMaximized: () => Promise<boolean>;
}

export interface ElectronAPI {
  notify: (title: string, body: string) => void;
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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

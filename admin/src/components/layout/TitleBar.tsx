import { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      notify: (title: string, body: string) => void;
      flashFrame: () => void;
      openExternal: (url: string) => void;
      onFocusChange: (callback: (focused: boolean) => void) => void;
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => void;
      windowControls: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        platform: string;
        isMaximized: () => Promise<boolean>;
      };
    };
  }
}

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isElectron = !!window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI!.windowControls.isMaximized().then(setIsMaximized);
    window.electronAPI!.onMaximizeChange(setIsMaximized);
  }, []);

  if (!isElectron) return null;

  return (
    <div className="h-8 bg-surface-0 flex items-center justify-between select-none app-drag-region flex-shrink-0 border-b border-surface-4/30">
      <div className="flex items-center pl-3">
        <span className="text-[11px] text-gray-500 font-medium tracking-wide">VOX Admin Portal</span>
      </div>
      <div className="flex items-center app-no-drag">
        <button
          onClick={() => window.electronAPI!.windowControls.minimize()}
          className="w-11 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-4 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.electronAPI!.windowControls.maximize()}
          className="w-11 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-4 transition-colors"
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          onClick={() => window.electronAPI!.windowControls.close()}
          className="w-11 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-danger/80 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

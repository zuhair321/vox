import React, { useEffect, useState } from 'react';

const TitleBar: React.FC = () => {
  const [platform, setPlatform] = useState<string>('win32');

  useEffect(() => {
    if ((window as any).electronAPI?.windowControls?.platform) {
      setPlatform((window as any).electronAPI.windowControls.platform);
    }
  }, []);

  const handleMinimize = () => (window as any).electronAPI?.windowControls?.minimize();
  const handleMaximize = () => (window as any).electronAPI?.windowControls?.maximize();
  const handleClose = () => (window as any).electronAPI?.windowControls?.close();

  const isMac = platform === 'darwin';

  const macControls = (
    <div className="no-drag" style={{ display: 'flex', gap: '8px' }}>
      <button className="mac-ctrl close" onClick={handleClose} />
      <button className="mac-ctrl min" onClick={handleMinimize} />
      <button className="mac-ctrl max" onClick={handleMaximize} />
    </div>
  );

  const winControls = (
    <div className="no-drag" style={{ display: 'flex', height: '100%' }}>
      <button className="win-ctrl min" onClick={handleMinimize}>−</button>
      <button className="win-ctrl max" onClick={handleMaximize}>□</button>
      <button className="win-ctrl close" onClick={handleClose}>×</button>
    </div>
  );

  return (
    <>
      <style>{`
        .vox-titlebar {
          height: 32px;
          background: #060709;
          border-bottom: 1px solid rgba(102, 0, 204, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          -webkit-app-region: drag;
          user-select: none;
          z-index: 10000;
          position: relative;
        }
        .vox-titlebar-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          color: var(--shadow);
          letter-spacing: 0.3em;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: none;
        }
        .mac-ctrl {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: var(--phantom);
          transition: background 0.15s;
        }
        .vox-titlebar:hover .mac-ctrl.close { background: #ff5f56; }
        .vox-titlebar:hover .mac-ctrl.min { background: #ffbd2e; }
        .vox-titlebar:hover .mac-ctrl.max { background: #27c93f; }
        .mac-ctrl.close:hover { filter: brightness(0.8); }
        .mac-ctrl.min:hover { filter: brightness(0.8); }
        .mac-ctrl.max:hover { filter: brightness(0.8); }

        .win-ctrl {
          background: transparent;
          border: none;
          color: var(--ghost-white);
          height: 100%;
          width: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-family: monospace;
          transition: background 0.15s;
        }
        .win-ctrl:hover { background: var(--rim); }
        .win-ctrl.close:hover { background: var(--blood); color: white; }
        .no-drag { -webkit-app-region: no-drag; }
      `}</style>
      <div className="vox-titlebar">
        {isMac ? macControls : <div />}
        <div className="vox-titlebar-title">VOX</div>
        {!isMac ? winControls : <div />}
      </div>
    </>
  );
};

export default TitleBar;

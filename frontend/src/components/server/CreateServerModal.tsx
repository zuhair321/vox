import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../stores/uiStore';
import { useServerStore } from '../../stores/serverStore';
import { createServer } from '../../api/servers';
import { API_BASE, getToken } from '../../api/client';
import { useNavigate } from 'react-router-dom';
import { validateServerName } from '../../utils/validation';
import { listTemplates, createFromTemplate, type ServerTemplate } from '../../api/templates';

const CreateServerModal: React.FC = () => {
  const { isCreateServerOpen, setCreateServerOpen, addToast } = useUiStore();
  const { fetchServers } = useServerStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'blank' | 'template'>('blank');
  const [templates, setTemplates] = useState<ServerTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  React.useEffect(() => {
    if (!isCreateServerOpen) return;
    listTemplates().then((d) => {
      setTemplates(d.templates);
      setSelectedTemplate(d.templates[0]?.id || '');
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateServerOpen]);

  if (!isCreateServerOpen) return null;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be under 5MB.', 'error');
      return;
    }
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setIconPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleBannerSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be under 5MB.', 'error');
      return;
    }
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setBannerPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleCreate = async () => {
    // Template mode: build a server from a saved template.
    if (mode === 'template') {
      if (!selectedTemplate) {
        addToast('Select a template first.', 'error');
        return;
      }
      setLoading(true);
      try {
        const res = await createFromTemplate({ templateId: selectedTemplate, name: name.trim() || undefined });
        const { addServer, setSelectedServer, setSelectedChannel } = useServerStore.getState();
        addServer(res.server);
        await fetchServers();
        // Land on the freshly forged realm. fetchServers() keeps the previously
        // selected server, so we must explicitly select the new one to match the
        // URL we're about to navigate to.
        setSelectedServer(res.server);
        setSelectedChannel(res.server.channels?.[0] || null);
        if (res.server.channels?.length > 0) {
          navigate(`/channels/${res.server.id}/${res.server.channels[0].id}`);
        } else {
          navigate(`/channels/${res.server.id}`);
        }
        addToast('⚡ Realm forged from template.', 'success');
        setCreateServerOpen(false);
        setName('');
        setIconPreview(null);
        setIconFile(null);
        setBannerPreview(null);
        setBannerFile(null);
        setMode('blank');
      } catch (e: any) {
        addToast(e.message || 'Failed to create server', 'error');
      }
      setLoading(false);
      return;
    }

    const error = validateServerName(name);
    if (error) {
      addToast(error, 'error');
      return;
    }
    setLoading(true);
    try {
      // Create server first — API returns { server }, unwrap it
      const { server } = await createServer(name);

      // Build the server with whatever uploads succeeded, so navigation always
      // has the right data even if uploads are slow or partially fail.
      let serverWithImages = { ...server };

      // Upload icon if selected
      if (iconFile) {
        const formData = new FormData();
        formData.append('file', iconFile);
        formData.append('serverId', server.id);

        const token = getToken();
        const res = await fetch(`${API_BASE}/api/upload/server-icon`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.server) serverWithImages = { ...serverWithImages, icon: data.server.icon };
        } else {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          addToast(`Icon upload failed: ${err.error}`, 'error');
        }
      }

      // Upload banner if selected
      if (bannerFile) {
        const formData = new FormData();
        formData.append('file', bannerFile);
        formData.append('serverId', server.id);

        const token = getToken();
        const res = await fetch(`${API_BASE}/api/upload/server-banner`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.server) serverWithImages = { ...serverWithImages, banner: data.server.banner };
        } else {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }));
          addToast(`Banner upload failed: ${err.error}`, 'error');
        }
      }

      // Add the fully-formed server to the store immediately so the banner/icon
      // are visible right after navigation — no round-trip lag.
      const { addServer } = useServerStore.getState();
      addServer(serverWithImages);

      // Also refresh the full list from the server for other consumers
      await fetchServers();

      // Land on the freshly forged realm. fetchServers() keeps the previously
      // selected server, so we must explicitly select the new one to match the
      // URL we're about to navigate to (otherwise the sidebar/main view show a
      // different server than the one just created).
      const { setSelectedServer, setSelectedChannel } = useServerStore.getState();
      setSelectedServer(serverWithImages);
      setSelectedChannel(serverWithImages.channels?.[0] || null);

      // Navigate to the new server
      if (serverWithImages.channels?.length > 0) {
        navigate(`/channels/${serverWithImages.id}/${serverWithImages.channels[0].id}`);
      } else {
        navigate(`/channels/${serverWithImages.id}`);
      }

      addToast('⚡ Realm forged. Welcome.', 'success');
      setCreateServerOpen(false);
      setName('');
      setIconPreview(null);
      setIconFile(null);
      setBannerPreview(null);
      setBannerFile(null);
    } catch (e: any) {
      addToast(e.message || 'Failed to create server', 'error');
    }
    setLoading(false);
  };

  const removeIcon = () => {
    setIconPreview(null);
    setIconFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeBanner = () => {
    setBannerPreview(null);
    setBannerFile(null);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.85)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
    }}>
      <div 
        style={{ 
          width: '440px', 
          backgroundColor: 'var(--dark-matter)', 
          border: '1px solid var(--rim)',
          padding: '24px', 
          position: 'relative',
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', backgroundColor: 'var(--chaos)', clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
        
        <h2 style={{ color: 'var(--ghost-white)', fontSize: '20px', marginBottom: '24px', textAlign: 'center', fontFamily: 'Cinzel, serif' }}>CREATE YOUR REALM</h2>

        {/* Mode toggle: blank vs. from template */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {(['blank', 'template'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '8px',
                background: mode === m ? 'rgba(216,74,90,0.12)' : 'var(--obsidian)',
                border: mode === m ? '1px solid rgba(216,74,90,0.4)' : '1px solid var(--rim)',
                borderRadius: '4px',
                color: mode === m ? 'var(--chaos)' : 'var(--ash)',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              {m === 'blank' ? 'FROM SCRATCH' : 'FROM TEMPLATE'}
            </button>
          ))}
        </div>

        {mode === 'template' ? (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--shadow)', marginBottom: '8px', letterSpacing: '0.1em' }}>CHOOSE TEMPLATE</label>
            <select
              className="angular-input"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              {templates.length === 0 && <option value="">No templates available</option>}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.channelCount} channels, {t.roleCount} roles</option>
              ))}
            </select>
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--shadow)', margin: '12px 0 8px', letterSpacing: '0.1em' }}>REALM NAME (OPTIONAL)</label>
            <input
              className="angular-input"
              placeholder="Leave blank to use template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        ) : (
        <>
        {/* Server Icon Upload */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--shadow)', marginBottom: '8px', letterSpacing: '0.1em' }}>REALM ICON (OPTIONAL)</label>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {/* Icon Preview */}
            <motion.div
              className="octagon"
              animate={{ 
                scale: isDragging ? 1.05 : 1,
                boxShadow: isDragging ? '0 0 20px var(--chaos)' : 'none'
              }}
              transition={{ duration: 0.15 }}
              style={{
                width: '80px',
                height: '80px',
                overflow: 'hidden',
                background: iconPreview 
                  ? 'var(--obsidian)' 
                  : 'linear-gradient(135deg, #2a3038, #4a535f)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isDragging ? '2px dashed var(--chaos)' : '2px solid transparent',
                flexShrink: 0,
              }}
            >
              {iconPreview ? (
                <img 
                  src={iconPreview} 
                  alt="Server icon preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                />
              ) : (
                <span style={{ color: '#0b0d11', fontWeight: 800, fontSize: '28px' }}>
                  {name ? name[0]?.toUpperCase() : '?'}
                </span>
              )}
            </motion.div>

            {/* Upload Controls */}
            <div style={{ flex: 1 }}>
              <AnimatePresence mode="wait">
                {iconPreview ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <button
                      type="button"
                      className="angular-button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                    >
                      CHANGE
                    </button>
                    <button
                      type="button"
                      className="angular-button"
                      onClick={removeIcon}
                      style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--blood)' }}
                    >
                      REMOVE
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <button
                      type="button"
                      className="angular-button primary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: '8px 14px', fontSize: '11px' }}
                    >
                      UPLOAD IMAGE
                    </button>
                    <span style={{ fontSize: '10px', color: 'var(--shadow)' }}>
                      PNG, JPG, GIF, or WebP • Max 5MB
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/gif,image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          </div>
        </div>

        {/* Server Banner Upload */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--shadow)', marginBottom: '8px', letterSpacing: '0.1em' }}>REALM BANNER (OPTIONAL)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Banner Preview */}
            <div
              style={{
                width: '200px',
                height: '60px',
                overflow: 'hidden',
                background: bannerPreview 
                  ? 'var(--obsidian)' 
                  : 'linear-gradient(135deg, #2a3038, #4a535f)',
                border: '1px solid var(--rim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
              }}
            >
              {bannerPreview ? (
                <img 
                  src={bannerPreview} 
                  alt="Banner preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
                />
              ) : (
                <span style={{ color: 'var(--shadow)', fontSize: '10px' }}>No banner</span>
              )}
            </div>

            {/* Banner Controls */}
            <div style={{ flex: 1 }}>
              <AnimatePresence mode="wait">
                {bannerPreview ? (
                  <motion.div
                    key="banner-preview"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <button
                      type="button"
                      className="angular-button"
                      onClick={() => bannerInputRef.current?.click()}
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                    >
                      CHANGE
                    </button>
                    <button
                      type="button"
                      className="angular-button"
                      onClick={removeBanner}
                      style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--blood)' }}
                    >
                      REMOVE
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="banner-upload"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <button
                      type="button"
                      className="angular-button"
                      onClick={() => bannerInputRef.current?.click()}
                      style={{ padding: '8px 14px', fontSize: '11px' }}
                    >
                      UPLOAD BANNER
                    </button>
                    <span style={{ fontSize: '10px', color: 'var(--shadow)' }}>
                      Wide image recommended • PNG, JPG, GIF, WebP • Max 5MB
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/gif,image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBannerSelect(file);
                }}
              />
            </div>
          </div>
        </div>

        {/* Server Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '10px', color: 'var(--shadow)', marginBottom: '8px', letterSpacing: '0.1em' }}>REALM NAME</label>
          <input 
            className="angular-input" 
            placeholder="The Dark Council" 
            value={name} 
            onChange={e => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) handleCreate();
            }}
          />
        </div>
        </>)}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
          <button className="angular-button" onClick={() => {
            setCreateServerOpen(false);
            setIconPreview(null);
            setIconFile(null);
            setBannerPreview(null);
            setBannerFile(null);
          }}>
            CANCEL
          </button>
          <motion.button 
            className={`angular-button primary ${loading ? 'btn-loading' : ''}`} 
            onClick={handleCreate} 
            disabled={!name.trim() || loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'FORGING...' : 'FORGE REALM →'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CreateServerModal;

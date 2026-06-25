import { FormEvent, useState, useRef } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { uploadMedia } from '../../api/uploads';
import { useUiStore } from '../../stores/uiStore';

interface VoidInputProps {
  channelName: string;
  onSend: (body: string) => void;
}

// Message composer with energy border on focus. Send button activates
// (chaos + glow) when there's text.
export default function VoidInput({ channelName, onSend }: VoidInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useUiStore();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      addToast('Only images (GIF, JPEG, PNG, WebP) are allowed.', 'error');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadMedia('chat', file);
      if (res?.url) {
        // Append the markdown image to the current input value
        setValue((prev) => (prev ? `${prev}\n![Attachment](${res.url})` : `![Attachment](${res.url})`));
        addToast('Attachment added', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasText = value.trim().length > 0;

  return (
    <form
      onSubmit={submit}
      className={focused ? 'energy-border-active' : ''}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto',
        gap: 10,
        alignItems: 'center',
        margin: '0 18px 18px',
        padding: '0 12px',
        clipPath: 'var(--cut-corner-all)',
        background: 'var(--dark-matter)',
        border: '1px solid var(--rim)',
      }}
    >
      <button 
        type="button" 
        title="Attach image" 
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{ display: 'grid', placeItems: 'center', color: 'var(--shadow)', padding: 8, background: 'none', border: 'none', cursor: uploading ? 'default' : 'pointer' }}
      >
        {uploading ? <Loader2 size={18} className="spin" /> : <Paperclip size={18} />}
      </button>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept="image/gif,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={`Transmit to #${channelName}`}
        style={{
          width: '100%',
          height: 46,
          background: 'transparent',
          border: 'none',
          color: 'var(--ghost-white)',
          padding: 0,
        }}
      />
      {value.length > 0 && (
        <span style={{ color: 'var(--shadow)', fontSize: 11, fontFamily: 'var(--font-ui)' }}>
          {value.length}
        </span>
      )}
      <button
        type="submit"
        className="void-pull"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 42,
          height: 42,
          clipPath: 'var(--octagon)',
          background: hasText ? 'var(--chaos)' : 'var(--phantom)',
          color: hasText ? '#fff' : 'var(--shadow)',
          boxShadow: hasText ? '0 0 20px var(--chaos-glow)' : 'none',
        }}
      >
        <Send size={18} />
      </button>
    </form>
  );
}

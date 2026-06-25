import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EMOJI_MAP } from '../../utils/markdown';

const RECENT_KEY = 'vox_recent_emoji';
const MAX_RECENT = 32;

const CATEGORIES = [
  { id: 'frequent', icon: '⭐', label: 'Frequently Used' },
  { id: 'smileys', icon: '😀', label: 'Smileys & People' },
  { id: 'animals', icon: '🐾', label: 'Animals & Nature' },
  { id: 'food', icon: '🍕', label: 'Food & Drink' },
  { id: 'activities', icon: '🎮', label: 'Activities' },
  { id: 'travel', icon: '🌍', label: 'Travel & Places' },
  { id: 'objects', icon: '💡', label: 'Objects' },
  { id: 'symbols', icon: '❤️', label: 'Symbols' },
  { id: 'flags', icon: '🚩', label: 'Flags' },
  { id: 'vox', icon: '🦇', label: 'VOX Custom' },
];

// Expanded emoji sets per category
const EMOJI_SETS: Record<string, string[]> = {
  smileys: [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩',
    '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫',
    '🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪',
    '🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🤠','🥳','🥸','😎',
    '🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰',
    '😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠',
    '🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖',
  ],
  animals: [
    '🐕','🐩','🦊','🐺','🦁','🐯','🐈','🐈‍⬛','🦁','🐮','🐷','🐽','🐸','🐵',
    '🙈','🙉','🙊','🐒','🦍','🦧','🐱','🐱‍👤','🐱‍💻','🐈‍⬛','🪶','🐓','🐔',
    '🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🐁','🐀','🐿️',
    '🦔','🐾','🐉','🐲','🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🍂',
  ],
  food: [
    '🍕','🍔','🍟','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥓','🥩',
    '🍗','🍖','🦴','🌭','🧇','🥞','🧈','🍞','🥐','🥖','🫓','🥨','🥯',
    '🥗','🥘','🫕','🫙','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙',
    '🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂',
    '🍮','🍭','🍬','🍫','🍿','☕','🍵','🧃','🥤','🍺','🍻','🥂','🍷','🍸',
  ],
  activities: [
    '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒',
    '🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹',
    '🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','⛹️','🤺','🤾','🏌️',
    '🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚴','🚵','🎮','🕹️','🎲','🧩','🎭',
  ],
  travel: [
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜',
    '🛵','🏍️','🚲','🛴','🛞','🚀','🛸','🛩️','✈️','🚁','🚤','🛥️','🚢',
    '🌍','🌎','🌏','🌐','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️',
    '🏟️','🏛️','🏗️','🧱','🪨','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦',
  ],
  objects: [
    '💡','🔦','🕯️','🪔','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿',
    '📀','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️',
    '⏰','⏱️','⏲️','🕰️','⌛','⏳','📡','🔋','🪫','🔌','🛒','🎁','🎈','🎏',
    '🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧','💌',
  ],
  symbols: [
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕',
    '💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎',
    '☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓',
    '🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚',
    '💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘',
    '❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞',
    '⚠️','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧',
  ],
  flags: [
    '🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇯🇵','🇨🇳',
    '🇰🇷','🇧🇷','🇮🇳','🇷🇺','🇨🇦','🇦🇺','🇲🇽','🇮🇹','🇪🇸','🇹🇷','🇸🇦','🇮🇱',
    '🇪🇬','🇿🇦','🇳🇬','🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇸🇪','🇳🇴','🇫🇮','🇩🇰','🇳🇱',
    '🇧🇪','🇨🇭','🇦🇹','🇵🇱','🇵🇹','🇬🇷','🇮🇪','🇮🇸',
  ],
  vox: [
    '🦇','💀','🔮','⚡','🗡️','⚔️','🛡️','👑','💎','🌙','☠️','🕷️','🐍','🐺',
    '🧛','👻','🧙','酿酒桶','🧪','🕯️','📜','🗝️','⛓️','🎭','🎪','🎨','🏗️',
  ],
};

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function addRecent(emoji: string) {
  const list = getRecent().filter((e) => e !== emoji);
  list.unshift(emoji);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    // no-op
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('frequent');
  const [tooltip, setTooltip] = useState<{ emoji: string; name: string; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCategory('frequent');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const recentEmojis = useMemo(() => getRecent(), [open]);

  const allEmojis = useMemo(() => {
    if (category === 'frequent') return recentEmojis;
    if (category === 'vox') return EMOJI_SETS.vox;
    return EMOJI_SETS[category] || [];
  }, [category, recentEmojis]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allEmojis;
    const q = query.trim().toLowerCase();
    return allEmojis.filter((e) => e.includes(q));
  }, [allEmojis, query]);

  const handleSelect = (emoji: string) => {
    addRecent(emoji);
    onSelect(emoji);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: '100%',
            right: '0',
            marginBottom: '8px',
            width: '320px',
            height: '400px',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--dark-matter)',
            border: '1px solid var(--rim)',
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(216,74,90,0.1)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search */}
          <div style={{ padding: '8px 8px 0' }}>
            <input
              ref={inputRef}
              type="text"
              className="angular-input"
              placeholder="Search emoji..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ height: '32px', fontSize: '12px' }}
            />
          </div>

          {/* Category tabs */}
          <div
            style={{
              display: 'flex',
              gap: '2px',
              padding: '6px 8px 4px',
              overflowX: 'auto',
              borderBottom: '1px solid var(--rim)',
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                title={cat.label}
                style={{
                  fontSize: '16px',
                  width: '30px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: category === cat.id ? 'var(--phantom)' : 'transparent',
                  border: 'none',
                  borderBottom: category === cat.id ? '2px solid var(--chaos)' : '2px solid transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  opacity: category === cat.id ? 1 : 0.6,
                }}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '4px',
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: '2px',
              alignContent: 'start',
            }}
          >
            {filtered.length === 0 && (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  color: 'var(--shadow)',
                  fontSize: '12px',
                  padding: '24px 0',
                }}
              >
                No emojis found.
              </div>
            )}
            {filtered.map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                onClick={() => handleSelect(emoji)}
                onMouseEnter={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTooltip({ emoji, name: emoji, x: rect.left + rect.width / 2, y: rect.top - 4 });
                }}
                onMouseLeave={(e: any) => {
                  setTooltip(null);
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
                style={{
                  fontSize: '22px',
                  width: '100%',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s, transform 0.1s',
                }}
                onMouseDownCapture={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--phantom)';
                }}
                onMouseUpCapture={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}

              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmojiPicker;

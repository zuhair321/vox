import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GifItem {
  id: string;
  url: string;
  title: string;
}

interface GifPickerProps {
  open: boolean;
  gifs: GifItem[]; // supplied by the parent (local library; no external API)
  onClose: () => void;
  onPick: (gif: GifItem) => void;
}

// Local-only GIF picker. The host supplies a list of GIFs (bundled assets or an
// internal library). We never call Tenor or any external service — search is a
// client-side title filter over the provided list.
const CATEGORIES = ['TRENDING', 'REACTIONS', 'GAMING', 'DARK', 'ANIME', 'MEMES'];

const GifPicker: React.FC<GifPickerProps> = ({ open, gifs, onClose, onPick }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('TRENDING');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return gifs;
    return gifs.filter((g) => g.title.toLowerCase().includes(q));
  }, [gifs, query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="gif-picker"
          role="dialog"
          aria-label="Pick a GIF"
        >
          <div className="gif-picker-search">
            <input
              className="angular-input"
              placeholder="Search GIFs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search GIFs"
              style={{ height: '36px' }}
            />
          </div>

          <div className="gif-picker-categories">
            {CATEGORIES.map((cat) => (
              <button key={cat}
                type="button"
                className={`gif-category ${category === cat ? 'active' : ''}`}
                onClick={() => {
                  setCategory(cat);
                  setQuery('');
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="gif-picker-grid">
            {filtered.length === 0 && (
              <div className="gif-picker-empty">No GIFs available.</div>
            )}
            {filtered.map((gif) => (
              <motion.button
                key={gif.id}
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="gif-tile"
                onClick={() => {
                  onPick(gif);
                  onClose();
                }}
                aria-label={`Send GIF: ${gif.title}`}
              >
                <img src={gif.url} alt={gif.title} loading="lazy" />
              </motion.button>
            ))}
          </div>

          <button
            type="button"
            className="gif-picker-close"
            onClick={onClose}
            aria-label="Close GIF picker"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GifPicker;

import React, { useEffect, useRef, useState } from 'react';
import { searchGifs } from '../../utils/giphy';

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: string;
  action: (args: string) => Promise<string | void>;
  args?: { label: string; placeholder: string; required?: boolean }[];
  handleInParent?: boolean; // Flag to indicate if parent should handle this command
}

const COMMANDS: SlashCommand[] = [
  {
    id: 'giphy',
    name: 'Giphy',
    description: 'Search and send a GIF',
    icon: '🎬',
    action: async (args) => {
      // For now, return a trending GIF. In future, could open a picker
      const { gifs } = await searchGifs(args || '', 1);
      if (gifs.length > 0) {
        return gifs[0].url;
      }
      return '';
    },
  },
  {
    id: 'nickname',
    name: 'Nickname',
    description: 'Change your nickname in this server',
    icon: '✏️',
    args: [{ label: 'nickname', placeholder: 'Enter nickname...', required: true }],
    action: async (nickname) => {
      // Return the nickname to be processed by parent
      return nickname;
    },
  },
  {
    id: 'shrug',
    name: 'Shrug',
    description: 'Append shrug kaomoji',
    icon: '🤷',
    action: async (args) => {
      return '¯\\_(ツ)_/¯';
    },
  },
  {
    id: 'tableflip',
    name: 'Tableflip',
    description: 'Append tableflip kaomoji',
    icon: '🔨',
    action: async () => '(╯°□°）╯︵ ┻━┻',
  },
  {
    id: 'lenny',
    name: 'Lenny Face',
    description: 'Append lenny face',
    icon: '😏',
    action: async () => '( ͡° ͜ʖ ͡°)',
  },
  {
    id: 'roll',
    name: 'Roll Dice',
    description: 'Roll a dice (e.g., /roll 2d6)',
    icon: '🎲',
    args: [{ label: 'dice', placeholder: 'e.g., 2d6', required: false }],
    action: async (dice) => {
      // Simple dice roll implementation
      const diceRegex = /^(\d+)d(\d+)$/;
      const match = (dice || '1d6').match(diceRegex);
      if (!match) {
        return 'Invalid dice format. Use NdM (e.g., 2d6)';
      }
      
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      
      if (isNaN(count) || isNaN(sides) || count <= 0 || sides <= 0 || count > 100) {
        return 'Invalid dice values. Count must be 1-100, sides must be positive.';
      }
      
      let total = 0;
      const rolls: number[] = [];
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
      }
      
      if (count === 1) {
        return `🎲 Rolled: ${rolls[0]}`;
      } else {
        return `🎲 Rolled ${rolls.join(', ')} = ${total}`;
      }
    },
  },
  {
    id: 'me',
    name: 'Me Action',
    description: 'Perform an action (e.g., /me waves)',
    icon: '👤',
    args: [{ label: 'action', placeholder: 'do something', required: true }],
    action: async (action) => {
      return `* ${action} *`;
    },
  },
  {
    id: 'wiki',
    name: 'Wikipedia Search',
    description: 'Search Wikipedia (e.g., /wiki javascript)',
    icon: '📚',
    args: [{ label: 'query', placeholder: 'search term', required: true }],
    action: async (query) => {
      try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query || '')}`);
        if (!response.ok) {
          return `❌ No Wikipedia page found for "${query || ''}"`;
        }
        const data = await response.json();
        return `📚 **${data.title}**\n${data.extract}`;
      } catch (error) {
        return `❌ Error searching Wikipedia: ${(error as unknown as Error)?.message}`;
      }
    },
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Get weather for a location (e.g., /weather london)',
    icon: '🌤️',
    args: [{ label: 'location', placeholder: 'city name', required: true }],
    action: async (location) => {
      // Using a free weather API (wttr.in) - in production, you'd use a proper API key
      try {
        const response = await fetch(`https://wttr.in/${encodeURIComponent(location || '')}?format=3`);
        if (!response.ok) {
          return `❌ Could not get weather for "${location || ''}"`;
        }
        const weatherData = await response.text();
        return `🌤️ ${weatherData}`;
      } catch (error) {
        return `❌ Error getting weather: ${(error as unknown as Error)?.message}`;
      }
    },
  },
  {
    id: 'coinflip',
    name: 'Coin Flip',
    description: 'Flip a coin',
    icon: '🪙',
    action: async () => {
      return Math.random() < 0.5 ? '🪙 Heads' : '🪙 Tails';
    },
  },
  {
    id: '8ball',
    name: 'Magic 8-Ball',
    description: 'Ask the magic 8-ball a question',
    icon: '🎱',
    args: [{ label: 'question', placeholder: 'ask a question', required: false }],
    action: async (question) => {
      const responses = [
        'It is certain',
        'It is decidedly so',
        'Without a doubt',
        'Yes definitely',
        'You may rely on it',
        'As I see it, yes',
        'Most likely',
        'Outlook good',
        'Yes',
        'Signs point to yes',
        'Reply hazy try again',
        'Ask again later',
        'Better not tell you now',
        'Cannot predict now',
        'Concentrate and ask again',
        'Don\'t count on it',
        'My reply is no',
        'My sources say no',
        'Outlook not so good',
        'Very doubtful'
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      return `🎱 ${randomResponse}`;
    },
  }
];

interface Props {
  query: string; // text after /, e.g. "roll"
  onSelect: (command: SlashCommand, args?: Record<string, string>) => void;
  onClose: () => void;
}

const SlashCommandMenu: React.FC<Props> = ({ query, onSelect, onClose }) => {
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.id.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (filtered[selected]) onSelect(filtered[selected]); }
      else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [filtered, selected, onSelect, onClose]);

  if (filtered.length === 0) {
    return (
      <div style={{
        position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px',
        background: 'var(--dark-matter)', border: '1px solid var(--rim)',
        borderRadius: '8px', padding: '12px', minWidth: '200px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 100,
      }}>
        <div style={{ fontSize: '12px', color: 'var(--ash)' }}>No commands found.</div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      style={{
        position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px',
        background: 'var(--dark-matter)', border: '1px solid var(--rim)',
        borderRadius: '8px', padding: '6px', minWidth: '240px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 100,
        maxHeight: '240px', overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: '10px', color: 'var(--shadow)', padding: '2px 8px 4px', fontWeight: 700, letterSpacing: '0.08em' }}>
        COMMANDS
      </div>
      {filtered.map((cmd, i) => (
        <div
          key={cmd.id}
          onClick={() => onSelect(cmd)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 10px', cursor: 'pointer', borderRadius: '6px',
            background: i === selected ? 'rgba(216,74,90,0.1)' : 'transparent',
            transition: 'background 0.1s',
          }}
        >
          <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{cmd.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: 'var(--ghost-white)', fontWeight: 600 }}>{cmd.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--ash)' }}>{cmd.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export { SlashCommandMenu, COMMANDS };
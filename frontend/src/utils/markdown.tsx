import React from 'react';

// ── 50 most common emoji shortcodes ────────────────────────────
const EMOJI_MAP: Record<string, string> = {
  fire: '🔥', skull: '💀', heart: '❤️', check: '✅', x: '❌',
  eyes: '👀', rocket: '🚀', star: '⭐', wave: '👋', think: '🤔',
  laugh: '😂', cry: '😢', angry: '😡', party: '🎉', pray: '🙏',
  hundred: '💯', clap: '👏', point_right: '👉', point_left: '👈',
  thumbsup: '👍', thumbsdown: '👎', muscle: '💪', brain: '🧠',
  ghost: '👻', snake: '🐍', spider: '🕷️', bat: '🦇', wolf: '🐺',
  vampire: '🧛', alien: '👽', robot: '🤖', crystal_ball: '🔮',
  lightning: '⚡', moon: '🌙', sun: '☀️', cloud: '☁️',
  rain: '🌧️', fire_extinguisher: '🧯', shield: '🛡️', lock: '🔒',
  key: '🔑', crown: '👑', gem: '💎', dice: '🎲',
  joystick: '🎮', computer: '💻', headphones: '🎧', coffee: '☕',
  pizza: '🍕',
};

interface Token {
  type: 'text' | 'code_block' | 'inline_code' | 'bold' | 'italic' | 'underline'
    | 'strikethrough' | 'spoiler' | 'blockquote' | 'link' | 'mention'
    | 'channel_link' | 'emoji' | 'br';
  content: string;
  lang?: string;
  emojiUrl?: string;
  animated?: boolean;
}

function tokenize(text: string, emojiResolver?: (name: string) => string | null): Token[] {
  const tokens: Token[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // ── Code blocks: ```lang\n...\n``` ─────────────────────
    const codeBlockMatch = remaining.match(/^```(\w*)\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      tokens.push({ type: 'code_block', content: codeBlockMatch[2], lang: codeBlockMatch[1] });
      remaining = remaining.slice(codeBlockMatch[0].length);
      continue;
    }

    // ── Inline code: `code` ──────────────────────────────────
    const inlineCodeMatch = remaining.match(/^`([^`]+)`/);
    if (inlineCodeMatch) {
      tokens.push({ type: 'inline_code', content: inlineCodeMatch[1] });
      remaining = remaining.slice(inlineCodeMatch[0].length);
      continue;
    }

    // ── Bold: **text** (must come before italic) ─────────────
    const boldMatch = remaining.match(/^\*\*([^\*]+)\*\*/);
    if (boldMatch) {
      tokens.push({ type: 'bold', content: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // ── Strikethrough: ~~text~~ ─────────────────────────────
    const strikeMatch = remaining.match(/^~~([^~]+)~~/);
    if (strikeMatch) {
      tokens.push({ type: 'strikethrough', content: strikeMatch[1] });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // ── Spoiler: ||text|| ────────────────────────────────────
    const spoilerMatch = remaining.match(/^\|\|([^|]+)\|\|/);
    if (spoilerMatch) {
      tokens.push({ type: 'spoiler', content: spoilerMatch[1] });
      remaining = remaining.slice(spoilerMatch[0].length);
      continue;
    }

    // ── Blockquote: > text (must be at start of line) ────────
    const quoteMatch = remaining.match(/^>\s(.+)/);
    if (quoteMatch) {
      tokens.push({ type: 'blockquote', content: quoteMatch[1] });
      remaining = remaining.slice(quoteMatch[0].length);
      continue;
    }

    // ── Links: https?://url ───────────────────────────────────
    const linkMatch = remaining.match(/^(https?:\/\/\S+)/);
    if (linkMatch) {
      tokens.push({ type: 'link', content: linkMatch[1] });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // ── Mentions: @username ──────────────────────────────────
    const mentionMatch = remaining.match(/^(@[A-Za-z0-9_]+)/);
    if (mentionMatch) {
      tokens.push({ type: 'mention', content: mentionMatch[1] });
      remaining = remaining.slice(mentionMatch[0].length);
      continue;
    }

    // ── Channel links: #channel-name ─────────────────────────
    const chanMatch = remaining.match(/^(#[A-Za-z0-9_-]+)/);
    if (chanMatch) {
      tokens.push({ type: 'channel_link', content: chanMatch[1] });
      remaining = remaining.slice(chanMatch[0].length);
      continue;
    }

    // ── Emoji: :name: ────────────────────────────────────────
    const emojiMatch = remaining.match(/^:([a-z_]+):/);
    if (emojiMatch) {
      const name = emojiMatch[1];
      // Custom server emoji (may be an animated gif) takes priority.
      const customUrl = emojiResolver ? emojiResolver(name) : null;
      if (customUrl) {
        tokens.push({
          type: 'emoji',
          content: name,
          emojiUrl: customUrl,
          animated: /\.gif(\?|$)/i.test(customUrl),
        });
      } else if (EMOJI_MAP[name]) {
        tokens.push({ type: 'emoji', content: EMOJI_MAP[name] });
      } else {
        // Unknown shortcode — keep the literal text.
        tokens.push({ type: 'text', content: emojiMatch[0] });
      }
      remaining = remaining.slice(emojiMatch[0].length);
      continue;
    }

    // ── Line break: \n ───────────────────────────────────────
    if (remaining[0] === '\n') {
      tokens.push({ type: 'br', content: '\n' });
      remaining = remaining.slice(1);
      continue;
    }

    // ── Bold with __: __text__ (check if NOT already italic) ─
    // We don't support underline via __ because it conflicts with bold.
    // Instead, we handle __ as bold for consistency.

    // ── Plain text: accumulate until next pattern ─────────────
    let end = 1;
    while (end < remaining.length) {
      const next = remaining.slice(end);
      if (
        next.startsWith('```') ||
        next.startsWith('`') ||
        next.startsWith('**') ||
        next.startsWith('~~') ||
        next.startsWith('||') ||
        next.startsWith('\n') ||
        (next[0] === '>' && end === 0) ||
        next.startsWith('http://') ||
        next.startsWith('https://') ||
        next.startsWith('@') ||
        next.startsWith('#') ||
        next.startsWith(':') ||
        next.startsWith(' ')
      ) {
        // check :emoji: pattern more precisely
        const emojiCheck = next.match(/^:([a-z_]+):/);
        if (next[0] === ':' && !emojiCheck) end++;
        else break;
      } else {
        end++;
      }
    }
    tokens.push({ type: 'text', content: remaining.slice(0, end) });
    remaining = remaining.slice(end);
  }

  return tokens;
}

function renderToken(token: Token, key: string): React.ReactNode {
  switch (token.type) {
    case 'text':
      return <React.Fragment key={key}>{token.content}</React.Fragment>;

    case 'code_block':
      return (
        <React.Fragment key={key}>
          <div style={{ marginTop: 4, marginBottom: 4 }}>
            <div className="code-block-wrapper">
              {token.lang && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 12,
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: '10px',
                    color: 'var(--shadow)',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {token.lang}
                </span>
              )}
              <CodeBlockWithCopy code={token.content} lang={token.lang} />
            </div>
          </div>
        </React.Fragment>
      );

    case 'inline_code':
      return (
        <code key={key} className="vox-inline-code">
          {token.content}
        </code>
      );

    case 'bold':
      return (
        <strong key={key} className="vox-bold-text">
          {token.content}
        </strong>
      );

    case 'italic':
      return (
        <em key={key} style={{ fontStyle: 'italic', color: 'var(--ash)' }}>
          {token.content}
        </em>
      );

    case 'strikethrough':
      return (
        <span key={key} style={{ textDecoration: 'line-through', opacity: 0.6 }}>
          {token.content}
        </span>
      );

    case 'spoiler':
      return <SpoilerSpan key={key} text={token.content} />;

    case 'blockquote':
      return (
        <blockquote key={key} className="vox-blockquote">
          {token.content}
        </blockquote>
      );

    case 'link':
      return (
        <a
          key={key}
          href={token.content}
          target="_blank"
          rel="noopener noreferrer"
          className="vox-link"
          onClick={(e) => e.stopPropagation()}
        >
          {token.content.length > 60 ? token.content.slice(0, 57) + '...' : token.content}
        </a>
      );

    case 'mention': {
      const isEveryone = token.content === '@everyone' || token.content === '@here';
      return (
        <span
          key={key}
          className="mention-chip"
          style={isEveryone ? { background: 'linear-gradient(135deg, #7d1f2b, #d84a5a)', color: '#fff', fontWeight: 700 } : undefined}
        >
          {token.content}
        </span>
      );
    }

    case 'channel_link':
      return (
        <span key={key} className="vox-channel-link">
          {token.content}
        </span>
      );

    case 'emoji':
      if (token.emojiUrl) {
        return (
          <img
            key={key}
            src={token.emojiUrl}
            alt={token.content}
            title={`:${token.content}:`}
            className={`vox-custom-emoji${token.animated ? ' animated' : ''}`}
            style={{
              width: '1.4em',
              height: '1.4em',
              verticalAlign: '-0.3em',
              objectFit: 'contain',
              margin: '0 1px',
            }}
          />
        );
      }
      return (
        <span key={key} style={{ fontSize: '1.2em' }} role="img" aria-label="emoji">
          {token.content}
        </span>
      );

    case 'br':
      return <br key={key} />;

    default:
      return <React.Fragment key={key}>{token.content}</React.Fragment>;
  }
}

function SpoilerSpan({ text }: { text: string }) {
  const [revealed, setRevealed] = React.useState(false);
  return (
    <span
      className={`vox-spoiler ${revealed ? 'revealed' : ''}`}
      onClick={() => setRevealed(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') setRevealed(true); }}
    >
      {text}
    </span>
  );
}

function CodeBlockWithCopy({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — no-op in restricted contexts.
    }
  };

  return (
    <div className="vox-code-block-container">
      <button
        type="button"
        className="vox-code-copy-btn"
        onClick={handleCopy}
        title={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? '✓ COPIED' : '📋 COPY'}
      </button>
      <pre className="vox-code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function parseMarkdown(
  text: string,
  emojiResolver?: (name: string) => string | null,
): React.ReactNode[] {
  if (!text) return [];
  const tokens = tokenize(text, emojiResolver);
  return tokens.map((token, i) => renderToken(token, `md-${i}`));
}

export { EMOJI_MAP };

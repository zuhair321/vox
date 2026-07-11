import React from 'react';
import { useNavigate } from 'react-router-dom';
import BackHeader from '../../components/settings/BackHeader';
import SectionHeader from '../../components/settings/SectionHeader';
import ToggleRow from '../../components/settings/ToggleRow';
import VoxCard from '../../components/settings/VoxCard';
import { useSettingsStore } from '../../stores/settingsStore';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const settings = useSettingsStore();

  return (
    <main className="settings-page">
      <BackHeader title="CHAT" onBack={() => navigate(-1)} />
      <div className="settings-list-stack">
        <section>
          <SectionHeader title="TEXT RENDERING" />
          <ToggleRow
            label="Render Embeds"
            description="Show rich link previews for URLs pasted in chat."
            value={settings.renderEmbeds}
            onChange={() => settings.toggle('renderEmbeds')}
          />
          <ToggleRow
            label="Show Emoji Reactions"
            description="Display emoji reactions beneath messages."
            value={settings.showEmojiReactions}
            onChange={() => settings.toggle('showEmojiReactions')}
          />
          <ToggleRow
            label="Animate Emoji"
            description="Animate custom and standard emoji in messages."
            value={settings.animateEmoji}
            onChange={() => settings.toggle('animateEmoji')}
          />
          <ToggleRow
            label="Convert Emoticons"
            description="Automatically convert text emoticons like :) to emoji."
            value={settings.convertEmoticons}
            onChange={() => settings.toggle('convertEmoticons')}
          />
        </section>

        <section>
          <SectionHeader title="IMAGES & MEDIA" />
          <ToggleRow
            label="Auto-Play GIFs"
            description="Automatically play GIF images when they appear in chat."
            value={settings.autoPlayGifs}
            onChange={() => settings.toggle('autoPlayGifs')}
          />
          <ToggleRow
            label="Show Attachment Previews"
            description="Preview image and video attachments inline."
            value={settings.attachmentPreviews}
            onChange={() => settings.toggle('attachmentPreviews')}
          />
          <ToggleRow
            label="Inline Link Previews"
            description="Fetch and display previews for linked content."
            value={settings.inlineLinkPreviews}
            onChange={() => settings.toggle('inlineLinkPreviews')}
          />
        </section>

        <section>
          <SectionHeader title="MARKDOWN" />
          <VoxCard>
            <div style={{ fontSize: '13px', color: 'var(--ash)', lineHeight: 1.6, fontFamily: "'Share Tech Mono', monospace" }}>
              <p>VOX supports full Markdown formatting:</p>
              <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
                <span><code style={{ color: 'var(--chaos)' }}>**bold**</code> → <strong style={{ color: 'var(--ghost-white)' }}>bold</strong></span>
                <span><code style={{ color: 'var(--chaos)' }}>*italic*</code> → <em style={{ color: 'var(--ghost-white)' }}>italic</em></span>
                <span><code style={{ color: 'var(--chaos)' }}>~~strike~~</code> → <s style={{ color: 'var(--ghost-white)' }}>strike</s></span>
                <span><code style={{ color: 'var(--chaos)' }}>`code`</code> → <code style={{ color: 'var(--ghost-white)', background: 'var(--obsidian)', padding: '1px 4px' }}>code</code></span>
                <span><code style={{ color: 'var(--chaos)' }}>||spoiler||</code> → <span style={{ background: 'var(--phantom)', padding: '1px 4px', color: 'transparent' }}>hidden</span></span>
                <span><code style={{ color: 'var(--chaos)' }}>&gt; quote</code> → blockquote</span>
              </div>
            </div>
          </VoxCard>
        </section>

        <section>
          <SectionHeader title="BEHAVIOR" />
          <ToggleRow
            label="Send on Enter"
            description="Press Enter to send messages. Use Shift+Enter for new lines."
            value={settings.sendOnEnter}
            onChange={() => settings.toggle('sendOnEnter')}
          />
          <ToggleRow
            label="Show Typing Indicators"
            description="Display when other users are typing in a channel."
            value={settings.showTypingIndicators}
            onChange={() => settings.toggle('showTypingIndicators')}
          />
          <ToggleRow
            label="Show Timestamps"
            description="Show message timestamps in chat."
            value={settings.showTimestamps}
            onChange={() => settings.toggle('showTimestamps')}
          />
          <ToggleRow
            label="Compact Mode"
            description="Fit more messages on screen with reduced spacing."
            value={settings.compactMode}
            onChange={() => settings.toggle('compactMode')}
          />
        </section>
      </div>
    </main>
  );
};

export default Chat;

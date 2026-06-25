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
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Show Emoji Reactions"
            description="Display emoji reactions beneath messages."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Animate Emoji"
            description="Animate custom and standard emoji in messages."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Convert Emoticons"
            description="Automatically convert text emoticons like :) to emoji."
            value={true}
            onChange={() => {}}
          />
        </section>

        <section>
          <SectionHeader title="IMAGES & MEDIA" />
          <ToggleRow
            label="Auto-Play GIFs"
            description="Automatically play GIF images when they appear in chat."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Show Attachment Previews"
            description="Preview image and video attachments inline."
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Inline Link Previews"
            description="Fetch and display previews for linked content."
            value={true}
            onChange={() => {}}
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
            value={true}
            onChange={() => {}}
          />
          <ToggleRow
            label="Show Typing Indicators"
            description="Display when other users are typing in a channel."
            value={true}
            onChange={() => {}}
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

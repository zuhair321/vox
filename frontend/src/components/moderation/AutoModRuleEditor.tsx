import React, { useState } from 'react';

interface Props {
  serverId: string;
  onSave?: (rule: any) => void;
  editingRule?: any;
}

const AutoModRuleEditor: React.FC<Props> = ({ serverId, onSave, editingRule }) => {
  const [name, setName] = useState(editingRule?.name || '');
  const [triggerType, setTriggerType] = useState(editingRule?.triggerType || 'KEYWORD');
  const [enabled, setEnabled] = useState(editingRule?.enabled ?? true);
  const [keywordList, setKeywordList] = useState((editingRule?.triggerConfig?.keywords || []).join(', '));
  const [matchMode, setMatchMode] = useState(editingRule?.triggerConfig?.matchMode || 'contains');
  const [maxMentions, setMaxMentions] = useState(editingRule?.triggerConfig?.maxMentions || 5);
  const [maxCaps, setMaxCaps] = useState(editingRule?.triggerConfig?.threshold || 70);
  const [minLength, setMinLength] = useState(editingRule?.triggerConfig?.minLength || 10);

  const handleSave = () => {
    const config: any = {};
    if (triggerType === 'KEYWORD') {
      config.keywords = keywordList.split(',').map((k: string) => k.trim()).filter(Boolean);
      config.matchMode = matchMode;
    } else if (triggerType === 'MENTION_SPAM') {
      config.maxMentions = maxMentions;
    } else if (triggerType === 'CAPS') {
      config.threshold = maxCaps;
      config.minLength = minLength;
    }
    onSave?.({ name, triggerType, enabled, triggerConfig: config });
  };

  return (
    <div className="vox-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input
        className="angular-input"
        placeholder="Rule name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ fontSize: '13px', padding: '8px 12px' }}
      />
      <select
        value={triggerType}
        onChange={(e) => setTriggerType(e.target.value)}
        className="angular-input"
        style={{ fontSize: '13px', padding: '8px 12px' }}
      >
        <option value="KEYWORD">Keyword Filter</option>
        <option value="MENTION_SPAM">Mention Spam</option>
        <option value="SPAM">Spam</option>
        <option value="INVITE_LINK">Invite Links</option>
        <option value="CAPS">Excessive Caps</option>
        <option value="EMOJI_SPAM">Emoji Spam</option>
        <option value="ZALGO_TEXT">Zalgo Text</option>
        <option value="LINK">Any Links</option>
        <option value="REGEX">Regex</option>
      </select>
      {triggerType === 'KEYWORD' && (
        <>
          <input
            className="angular-input"
            placeholder="Keywords (comma separated)"
            value={keywordList}
            onChange={(e) => setKeywordList(e.target.value)}
            style={{ fontSize: '13px', padding: '8px 12px' }}
          />
          <select value={matchMode} onChange={(e) => setMatchMode(e.target.value)} className="angular-input" style={{ fontSize: '13px', padding: '8px 12px' }}>
            <option value="contains">Contains</option>
            <option value="exact">Exact</option>
            <option value="word">Whole Word</option>
            <option value="regex">Regex</option>
          </select>
        </>
      )}
      {triggerType === 'MENTION_SPAM' && (
        <input
          className="angular-input"
          type="number"
          placeholder="Max mentions"
          value={maxMentions}
          onChange={(e) => setMaxMentions(Number(e.target.value))}
          style={{ fontSize: '13px', padding: '8px 12px', width: '120px' }}
        />
      )}
      {triggerType === 'CAPS' && (
        <>
          <input
            className="angular-input"
            type="number"
            placeholder="Caps threshold %"
            value={maxCaps}
            onChange={(e) => setMaxCaps(Number(e.target.value))}
            style={{ fontSize: '13px', padding: '8px 12px', width: '120px' }}
          />
          <input
            className="angular-input"
            type="number"
            placeholder="Min length"
            value={minLength}
            onChange={(e) => setMinLength(Number(e.target.value))}
            style={{ fontSize: '13px', padding: '8px 12px', width: '120px' }}
          />
        </>
      )}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button className="angular-button primary" onClick={handleSave} style={{ padding: '8px 16px', fontSize: '12px' }}>
          Save Rule
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ghost-white)', fontSize: '12px' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
      </div>
    </div>
  );
};

export default AutoModRuleEditor;

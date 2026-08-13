import { create } from 'zustand';

export type VoxTheme = 'void' | 'crimson' | 'specter';
export type VoxFontSize = 'small' | 'medium' | 'large';
export type SpamFilter = 'all' | 'non-friends' | 'none';

export type BooleanSettingKey =
  // privacy
  | 'compactMode'
  | 'showRoleColors'
  | 'allowDMs'
  | 'messageRequests'
  | 'friendRequestsEveryone'
  | 'friendRequestsFoF'
  | 'friendRequestsMembers'
  | 'syncContacts'
  | 'phoneDiscovery'
  | 'emailDiscovery'
  | 'ageRestrictedCommands'
  | 'shareOnlineStatus'
  | 'shareProfileUpdates'
  | 'voiceVerificationCodes'
  | 'dataImprovement'
  | 'dataPersonalization'
  | 'activityPersonalization'
  | 'thirdPartyPersonalization'
  // notifications
  | 'desktopNotifications'
  | 'notificationSounds'
  | 'unreadBadge'
  | 'flashFrame'
  | 'notifyAllMessages'
  | 'notifyMentions'
  | 'notifyDMs'
  | 'notifyCalls'
  | 'notifyFriendRequests'
  | 'soundMessageSend'
  | 'soundMessageReceive'
  | 'soundVoiceConnect'
  | 'soundDeafen'
  | 'dndSuppressAll'
  | 'dndAllowFriendDMs'
  // chat
  | 'renderEmbeds'
  | 'showEmojiReactions'
  | 'animateEmoji'
  | 'convertEmoticons'
  | 'autoPlayGifs'
  | 'attachmentPreviews'
  | 'inlineLinkPreviews'
  | 'showTimestamps'
  | 'sendOnEnter'
  | 'showTypingIndicators'
  // voice
  | 'noiseSuppression'
  | 'echoCancellation'
  | 'autoGainControl'
  | 'voiceActivity'
  | 'pushToTalk';

interface SettingsStore {
  theme: VoxTheme;
  fontSize: VoxFontSize;
  compactMode: boolean;
  showRoleColors: boolean;
  allowDMs: boolean;
  messageRequests: boolean;
  friendRequestsEveryone: boolean;
  friendRequestsFoF: boolean;
  friendRequestsMembers: boolean;
  syncContacts: boolean;
  phoneDiscovery: boolean;
  emailDiscovery: boolean;
  ageRestrictedCommands: boolean;
  shareOnlineStatus: boolean;
  shareProfileUpdates: boolean;
  voiceVerificationCodes: boolean;
  dataImprovement: boolean;
  dataPersonalization: boolean;
  activityPersonalization: boolean;
  thirdPartyPersonalization: boolean;
  spamFilter: SpamFilter;
  // notifications
  desktopNotifications: boolean;
  notificationSounds: boolean;
  unreadBadge: boolean;
  flashFrame: boolean;
  notifyAllMessages: boolean;
  notifyMentions: boolean;
  notifyDMs: boolean;
  notifyCalls: boolean;
  notifyFriendRequests: boolean;
  soundMessageSend: boolean;
  soundMessageReceive: boolean;
  soundVoiceConnect: boolean;
  soundDeafen: boolean;
  dndSuppressAll: boolean;
  dndAllowFriendDMs: boolean;
  // chat
  renderEmbeds: boolean;
  showEmojiReactions: boolean;
  animateEmoji: boolean;
  convertEmoticons: boolean;
  autoPlayGifs: boolean;
  attachmentPreviews: boolean;
  inlineLinkPreviews: boolean;
  showTimestamps: boolean;
  sendOnEnter: boolean;
  showTypingIndicators: boolean;
  // voice
  inputDevice: string;
  outputDevice: string;
  inputVolume: number;
  outputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  voiceActivity: boolean;
  pushToTalk: boolean;
  pushToTalkKey: string;
  voiceNoiseLevel: number;
  videoDevice: string;

  toggle: (key: BooleanSettingKey) => void;
  setTheme: (theme: VoxTheme) => void;
  setFontSize: (size: VoxFontSize) => void;
  setSpamFilter: (filter: SpamFilter) => void;
  setInputDevice: (device: string) => void;
  setOutputDevice: (device: string) => void;
  setInputVolume: (vol: number) => void;
  setOutputVolume: (vol: number) => void;
  setPushToTalkKey: (key: string) => void;
  setVoiceNoiseLevel: (level: number) => void;
  setVideoDevice: (device: string) => void;
}

const SETTINGS_KEY = 'vox_settings';

const DEFAULTS: SettingsStore = {
  theme: 'void',
  fontSize: 'medium',
  compactMode: false,
  showRoleColors: true,
  allowDMs: true,
  messageRequests: false,
  friendRequestsEveryone: true,
  friendRequestsFoF: true,
  friendRequestsMembers: true,
  syncContacts: false,
  phoneDiscovery: false,
  emailDiscovery: false,
  ageRestrictedCommands: false,
  shareOnlineStatus: true,
  shareProfileUpdates: true,
  voiceVerificationCodes: false,
  dataImprovement: true,
  dataPersonalization: true,
  activityPersonalization: true,
  thirdPartyPersonalization: true,
  spamFilter: 'non-friends',
  // notifications
  desktopNotifications: true,
  notificationSounds: true,
  unreadBadge: true,
  flashFrame: true,
  notifyAllMessages: false,
  notifyMentions: true,
  notifyDMs: true,
  notifyCalls: true,
  notifyFriendRequests: true,
  soundMessageSend: true,
  soundMessageReceive: true,
  soundVoiceConnect: true,
  soundDeafen: true,
  dndSuppressAll: true,
  dndAllowFriendDMs: false,
  // chat
  renderEmbeds: true,
  showEmojiReactions: true,
  animateEmoji: true,
  convertEmoticons: true,
  autoPlayGifs: true,
  attachmentPreviews: true,
  inlineLinkPreviews: true,
  showTimestamps: true,
  sendOnEnter: true,
  showTypingIndicators: true,
  // voice
  inputDevice: 'default',
  outputDevice: 'default',
  inputVolume: 80,
  outputVolume: 80,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  voiceActivity: true,
  pushToTalk: false,
  pushToTalkKey: 'V',
  voiceNoiseLevel: 0,
  videoDevice: 'default',
  // no-ops for type
  toggle: () => {},
  setTheme: () => {},
  setFontSize: () => {},
  setSpamFilter: () => {},
  setInputDevice: () => {},
  setOutputDevice: () => {},
  setInputVolume: () => {},
  setOutputVolume: () => {},
  setPushToTalkKey: () => {},
  setVoiceNoiseLevel: () => {},
  setVideoDevice: () => {},
};

function loadSaved(): Partial<SettingsStore> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function save(state: SettingsStore) {
  const { toggle, setTheme, setFontSize, setSpamFilter, setInputDevice, setOutputDevice, setInputVolume, setOutputVolume, setPushToTalkKey, setVoiceNoiseLevel, setVideoDevice, ...data } = state;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(data)); } catch {}
}

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const saved = loadSaved();
  const initial = { ...DEFAULTS, ...saved };

  return {
    ...initial,
    toggle: (key) => {
      set((state) => {
        const next = { ...state, [key]: !state[key] };
        save(next);
        return next;
      });
    },
    setTheme: (theme) => set((state) => { const next = { ...state, theme }; save(next); return next; }),
    setFontSize: (fontSize) => set((state) => { const next = { ...state, fontSize }; save(next); return next; }),
    setSpamFilter: (spamFilter) => set((state) => { const next = { ...state, spamFilter }; save(next); return next; }),
    setInputDevice: (inputDevice) => set((state) => { const next = { ...state, inputDevice }; save(next); return next; }),
    setOutputDevice: (outputDevice) => set((state) => { const next = { ...state, outputDevice }; save(next); return next; }),
    setInputVolume: (inputVolume) => set((state) => { const next = { ...state, inputVolume }; save(next); return next; }),
    setOutputVolume: (outputVolume) => set((state) => { const next = { ...state, outputVolume }; save(next); return next; }),
    setPushToTalkKey: (pushToTalkKey) => set((state) => { const next = { ...state, pushToTalkKey }; save(next); return next; }),
    setVoiceNoiseLevel: (voiceNoiseLevel) => set((state) => { const next = { ...state, voiceNoiseLevel }; save(next); return next; }),
    setVideoDevice: (videoDevice) => set((state) => { const next = { ...state, videoDevice }; save(next); return next; }),
  };
});

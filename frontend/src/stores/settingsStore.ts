import { create } from 'zustand';

export type VoxTheme = 'void' | 'crimson' | 'specter';
export type VoxFontSize = 'small' | 'medium' | 'large';
export type SpamFilter = 'all' | 'non-friends' | 'none';

export type BooleanSettingKey =
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
  | 'thirdPartyPersonalization';

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
  toggle: (key: BooleanSettingKey) => void;
  setTheme: (theme: VoxTheme) => void;
  setFontSize: (size: VoxFontSize) => void;
  setSpamFilter: (filter: SpamFilter) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
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
  toggle: (key) => set((state) => ({ [key]: !state[key] })),
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  setSpamFilter: (spamFilter) => set({ spamFilter }),
}));

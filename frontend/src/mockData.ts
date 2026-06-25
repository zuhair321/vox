import { User, Server, Channel, Message } from './types';

// Users
export const users: Record<string, User> = {
  alice: { id: '1', name: 'Alice', avatar: 'https://i.pravatar.cc/150?u=alice', status: 'online', activity: 'Playing Valorant', role: 'Founder' },
  bob: { id: '2', name: 'Bob', avatar: 'https://i.pravatar.cc/150?u=bob', status: 'idle', activity: 'Afk', role: 'Admin' },
  charlie: { id: '3', name: 'Charlie', avatar: 'https://i.pravatar.cc/150?u=charlie', status: 'dnd', activity: 'In Meeting', role: 'Admin' },
  dave: { id: '4', name: 'Dave', avatar: 'https://i.pravatar.cc/150?u=dave', status: 'offline', role: 'Moderator' },
  eve: { id: '5', name: 'Eve', avatar: 'https://i.pravatar.cc/150?u=eve', status: 'online', role: 'Moderator' },
  frank: { id: '6', name: 'Frank', avatar: 'https://i.pravatar.cc/150?u=frank', status: 'online', activity: 'Listening to Spotify', role: 'Moderator' },
  grace: { id: '7', name: 'Grace', avatar: 'https://i.pravatar.cc/150?u=grace', status: 'idle', role: 'Member' },
  henry: { id: '8', name: 'Henry', avatar: 'https://i.pravatar.cc/150?u=henry', status: 'offline', role: 'Member' },
  ivy: { id: '9', name: 'Ivy', avatar: 'https://i.pravatar.cc/150?u=ivy', status: 'online', role: 'Member' },
  jack: { id: '10', name: 'Jack', avatar: 'https://i.pravatar.cc/150?u=jack', status: 'dnd', role: 'Member' },
  kevin: { id: '11', name: 'Kevin', avatar: 'https://i.pravatar.cc/150?u=kevin', status: 'online', role: 'Member' },
  me: { id: '12', name: 'Zuhair', avatar: 'https://i.pravatar.cc/150?u=me', status: 'online' },
};

// DM Contacts
export const dmContacts: User[] = [
  users.alice, users.bob, users.charlie, users.dave, users.eve, users.frank, users.grace, users.henry, users.ivy, users.jack
];

// Servers
export const servers: Server[] = [
  { id: 'hq', name: 'Vox HQ', icon: null, badgeCount: 0 },
  { id: 'gaming', name: 'Gaming', icon: 'https://ui-avatars.com/api/?name=Gaming&background=1c1d22&color=fff', badgeCount: 3 },
  { id: 'music', name: 'Music Lounge', icon: 'https://ui-avatars.com/api/?name=Music&background=1c1d22&color=fff', badgeCount: 0 },
  { id: 'dev', name: 'Dev Corner', icon: 'https://ui-avatars.com/api/?name=Dev&background=1c1d22&color=fff', badgeCount: 12 },
  { id: 'art', name: 'Art Studio', icon: 'https://ui-avatars.com/api/?name=Art&background=1c1d22&color=fff', badgeCount: 0 },
  { id: 'anime', name: 'Anime Club', icon: 'https://ui-avatars.com/api/?name=Anime&background=1c1d22&color=fff', badgeCount: 99 },
];

// Channels
export const channels: Channel[] = [
  { id: 'c1', name: 'general', type: 'text' },
  { id: 'c2', name: 'announcements', type: 'text', locked: true },
  { id: 'c3', name: 'resources', type: 'text' },
  { id: 'c4', name: 'General Voice', type: 'voice', activeUsers: [users.alice, users.bob, users.eve], timer: '23:45' },
  { id: 'c5', name: 'Gaming', type: 'voice' },
  { id: 'c6', name: 'AFK', type: 'voice', locked: true },
];

// Messages
export const messages: Message[] = [
  { id: 'm0', user: users.alice, content: '', timestamp: '', dateDivider: '23 June 2026' },
  { id: 'm1', user: users.alice, content: 'Hey everyone! Welcome to Vox HQ.', timestamp: '10:00 AM' },
  { id: 'm2', user: users.bob, content: 'Thanks! The new design looks sick.', timestamp: '10:05 AM' },
  { id: 'm3', user: users.bob, content: 'Has anyone tested the voice channels yet?', timestamp: '10:06 AM', isConsecutive: true },
  { id: 'm4', user: users.charlie, content: 'Yeah, I was just in there with Eve. Crystal clear.', timestamp: '10:15 AM' },
  { id: 'm5', user: users.eve, content: '@Alice when are we pushing the next update?', timestamp: '10:30 AM', mentions: ['Alice'] },
  { id: 'm6', user: users.alice, content: 'We are aiming for this Friday. Just need to iron out a few bugs.', timestamp: '10:35 AM' },
  { id: 'm7', user: users.frank, content: 'Can we get more themes? I really want a Cherry theme.', timestamp: '11:00 AM' },
  { id: 'm8', user: users.dave, content: 'I got you covered.', timestamp: '11:05 AM' },
  { id: 'm9', user: users.dave, content: 'Checkout this sneak peek:', timestamp: '11:05 AM', isConsecutive: true },
  { id: 'm10', user: users.dave, content: '', timestamp: '11:06 AM', isConsecutive: true, isGif: true, gifData: { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDExOTgwaHJlMnV4MGRqZWVneGNjeXZ1a2Z2M2E4MzMwYzZtczNwZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o72FkiKZhYcgEouFi/giphy.gif', caption: 'Hype' } },
  { id: 'm11', user: users.grace, content: 'Whoa that looks amazing.', timestamp: '11:10 AM' },
  { id: 'm12', user: users.alice, content: '@Dave ship it!', timestamp: '11:15 AM', mentions: ['Dave'] },
];

export const memberRoles = {
  Founder: [users.alice],
  Admin: [users.bob, users.charlie],
  Moderator: [users.dave, users.eve, users.frank],
  Member: [users.grace, users.henry, users.ivy, users.jack, users.kevin],
};

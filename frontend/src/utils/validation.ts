export const validateServerName = (name: string): string | null => {
  if (name.length < 2) return 'Realm name must be at least 2 characters.';
  if (name.length > 100) return 'Realm name must be under 100 characters.';
  return null;
};

export const validateChannelName = (name: string): { error: string | null; formatted: string } => {
  let formatted = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (formatted.length < 1) return { error: 'Channel name is required.', formatted };
  if (formatted.length > 50) return { error: 'Channel name must be under 50 characters.', formatted };
  return { error: null, formatted };
};

export const validateMessage = (text: string): string | null => {
  if (text.length > 2000) return 'Message exceeds 2000 character limit.';
  return null;
};

export const validateUsername = (username: string): string | null => {
  if (username.length < 2) return 'Username must be at least 2 characters.';
  if (username.length > 32) return 'Username must be under 32 characters.';
  if (/\s/.test(username)) return 'Username cannot contain spaces.';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores.';
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
};

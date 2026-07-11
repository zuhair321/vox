// Vox Mobile — DM ID helper (must match web convention)

export function buildDmId(userA: string, userB: string): string {
  return [userA, userB].sort().join('_');
}

export function extractOtherUserId(dmId: string, currentUserId: string): string {
  const [a, b] = dmId.split('_');
  return a === currentUserId ? b : a;
}

import { prisma } from '../lib/prisma.js';

export async function getMemberCustomPowers(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    select: { customPowers: true },
  });

  if (!member?.customPowers) return [];

  const powerIds = Object.keys(member.customPowers || {});
  const powers = await prisma.customPower.findMany({
    where: { serverId, id: { in: powerIds } },
  });
  return powers;
}

export async function hasCustomPower(serverId, userId, powerId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    select: { customPowers: true },
  });

  if (!member?.customPowers) return false;
  return Object.prototype.hasOwnProperty.call(member.customPowers || {}, powerId);
}

export async function resolveCustomGrants(serverId, userId) {
  const powers = await getMemberCustomPowers(serverId, userId);

  const result = {
    permissions: [],
    bypasses: [],
    quotas: {},
    features: {},
  };

  for (const power of powers) {
      const grants = power.grants || [];
    for (const grant of grants) {
      switch (grant.type) {
        case 'permission':
          if (!result.permissions.includes(grant.permission)) {
            result.permissions.push(grant.permission);
          }
          break;
        case 'bypass':
          if (!result.bypasses.includes(grant.restriction)) {
            result.bypasses.push(grant.restriction);
          }
          break;
        case 'quota':
          result.quotas[grant.resource] = Math.max(result.quotas[grant.resource] ?? 0, grant.limit);
          break;
        case 'feature':
          result.features[grant.feature] = grant.config;
          break;
      }
    }
  }

  return result;
}

export async function canBypass(serverId, userId, restriction) {
  const grants = await resolveCustomGrants(serverId, userId);
  return grants.bypasses.includes(restriction);
}

export async function getExistingPowers(serverId, userId) {
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    select: { customPowers: true },
  });
  return (member?.customPowers) || {};
}

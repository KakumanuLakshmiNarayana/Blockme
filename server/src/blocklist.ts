import { getEnabledDomains } from './db/queries';

// In-memory cache — refreshed after any domain change
let blockSet: Set<string> = new Set();

export function refreshBlockSet(): void {
  const domains = getEnabledDomains();
  blockSet = new Set(domains.map(d => d.toLowerCase()));
}

export function getBlockSet(): Set<string> {
  return blockSet;
}

/**
 * Check if a DNS query name should be blocked.
 * Uses suffix-walk: if 'instagram.com' is blocked, then
 * 'api.instagram.com', 'cdn.instagram.com', etc. are also blocked.
 */
export function isDomainBlocked(queryName: string, set: Set<string> = blockSet): boolean {
  const name = queryName.toLowerCase().replace(/\.$/, '');
  if (set.has(name)) return true;

  const parts = name.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    if (set.has(parts.slice(i).join('.'))) return true;
  }
  return false;
}

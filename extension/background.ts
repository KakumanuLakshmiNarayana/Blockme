// Blockme browser extension — URL pattern blocking (YouTube Shorts, etc.)
// Fetches enabled url_rules from the Blockme server and applies them as
// declarativeNetRequest rules, blocking specific URL patterns that DNS alone cannot target.

const BLOCKME_URL = 'http://localhost:3000';
const FETCH_INTERVAL_MINUTES = 5;

interface UrlRule {
  id: number;
  platform_id: number;
  name: string;
  pattern: string;
  enabled: number;
}

async function fetchAndApplyRules(): Promise<void> {
  try {
    const res = await fetch(`${BLOCKME_URL}/api/blocklist`);
    if (!res.ok) return;
    const data = await res.json();
    const rules: UrlRule[] = data.url_rules || [];

    const enabledRules = rules.filter((r: UrlRule) => r.enabled);

    // Convert url_rules patterns to declarativeNetRequest rules
    const dnrRules = enabledRules.map((rule: UrlRule, index: number) => ({
      id: index + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: rule.pattern.replace(/\*/g, '*'),
        resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image'],
      },
    }));

    // Get existing dynamic rules to remove
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existing.map((r: { id: number }) => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: dnrRules,
    });

    // Store count in extension storage
    await chrome.storage.local.set({
      rule_count: dnrRules.length,
      last_sync: new Date().toISOString(),
    });
  } catch {
    // Blockme server unreachable — keep existing rules
  }
}

// Fetch rules on startup
fetchAndApplyRules();

// Refresh every 5 minutes
chrome.alarms.create('refresh_rules', { periodInMinutes: FETCH_INTERVAL_MINUTES });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh_rules') fetchAndApplyRules();
});

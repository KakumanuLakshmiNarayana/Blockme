chrome.storage.local.get(['rule_count', 'last_sync'], (data) => {
  const rulesEl = document.getElementById('rules');
  const syncEl = document.getElementById('sync');
  if (rulesEl) rulesEl.textContent = String(data.rule_count ?? 0);
  if (syncEl) syncEl.textContent = data.last_sync
    ? new Date(data.last_sync).toLocaleTimeString()
    : 'Never';
});

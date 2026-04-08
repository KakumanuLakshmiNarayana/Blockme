import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getBlocklist,
  getSession,
  togglePlatform,
  toggleUrlRule,
  addCustomDomain,
  deleteCustomDomain,
  type Platform,
} from '../api/client';
import { usePolling } from '../hooks/usePolling';

const C = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#f8fafc',
  muted: '#94a3b8',
};

const CATEGORY_ORDER = ['social', 'video', 'messaging', 'professional'];

export default function BlocklistScreen() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [list, session] = await Promise.all([getBlocklist(), getSession()]);
      setPlatforms(list);
      setSessionLocked(
        !!session.session && session.session.locked === 1 && session.session.state !== 'ended'
      );
    } catch {
      /* ignore */
    }
  }, []);

  usePolling(fetchData, 30_000);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function handleTogglePlatform(id: number, currentEnabled: number) {
    if (sessionLocked) {
      Alert.alert('Session Active', 'Cannot change blocklist while a blocking session is active.');
      return;
    }
    const key = `platform-${id}`;
    setLoadingId(key);
    try {
      await togglePlatform(id, currentEnabled === 0);
      setPlatforms((prev) =>
        prev.map((p) => (p.id === id ? { ...p, enabled: currentEnabled === 0 ? 1 : 0 } : p))
      );
    } catch {
      Alert.alert('Error', 'Failed to update platform. Please try again.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleToggleUrlRule(platformId: number, ruleId: number, currentEnabled: number) {
    if (sessionLocked) {
      Alert.alert('Session Active', 'Cannot change rules while a blocking session is active.');
      return;
    }
    const key = `rule-${ruleId}`;
    setLoadingId(key);
    try {
      await toggleUrlRule(ruleId, currentEnabled === 0);
      setPlatforms((prev) =>
        prev.map((p) =>
          p.id === platformId
            ? {
                ...p,
                url_rules: p.url_rules.map((r) =>
                  r.id === ruleId ? { ...r, enabled: currentEnabled === 0 ? 1 : 0 } : r
                ),
              }
            : p
        )
      );
    } catch {
      Alert.alert('Error', 'Failed to update rule.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleAddDomain(platformId: number) {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      Alert.alert('Invalid Domain', 'Enter a valid domain like example.com');
      return;
    }
    setAddingDomain(true);
    try {
      await addCustomDomain(domain);
      setNewDomain('');
      await fetchData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Could not add domain.');
    } finally {
      setAddingDomain(false);
    }
  }

  async function handleDeleteDomain(id: number) {
    if (sessionLocked) {
      Alert.alert('Session Active', 'Cannot change blocklist during an active session.');
      return;
    }
    Alert.alert('Remove Domain', 'Remove this custom domain from the blocklist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCustomDomain(id);
            await fetchData();
          } catch {
            Alert.alert('Error', 'Failed to remove domain.');
          }
        },
      },
    ]);
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: platforms.filter((p) => p.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Blocklist</Text>
        {sessionLocked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color={C.warning} />
            <Text style={styles.lockBadgeText}>Session Active</Text>
          </View>
        )}
      </View>

      {grouped.map(({ category, items }) => (
        <View key={category} style={styles.section}>
          <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>

          {items.map((platform) => (
            <View key={platform.id} style={styles.platformCard}>
              {/* Platform Row */}
              <TouchableOpacity
                style={styles.platformRow}
                onPress={() => setExpanded((e) => (e === platform.id ? null : platform.id))}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.platformName, platform.enabled === 0 && styles.textDisabled]}>
                    {platform.name}
                  </Text>
                  <Text style={styles.domainCount}>
                    {platform.domains.length} domain{platform.domains.length !== 1 ? 's' : ''}
                    {platform.url_rules.length > 0
                      ? ` · ${platform.url_rules.length} URL rule${platform.url_rules.length !== 1 ? 's' : ''}`
                      : ''}
                  </Text>
                </View>

                {loadingId === `platform-${platform.id}` ? (
                  <ActivityIndicator size="small" color={C.primary} style={{ marginRight: 8 }} />
                ) : (
                  <Switch
                    value={platform.enabled === 1}
                    onValueChange={() => handleTogglePlatform(platform.id, platform.enabled)}
                    disabled={sessionLocked || loadingId !== null}
                    trackColor={{ false: C.border, true: '#1d4ed8' }}
                    thumbColor={platform.enabled === 1 ? C.primary : C.muted}
                  />
                )}

                <Ionicons
                  name={expanded === platform.id ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={C.muted}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>

              {/* Expanded Content */}
              {expanded === platform.id && (
                <View style={styles.expandedContent}>
                  {/* Domains */}
                  <Text style={styles.expandLabel}>Domains</Text>
                  {platform.domains.map((d) => (
                    <View key={d.id} style={styles.domainRow}>
                      <Ionicons
                        name={d.enabled === 1 ? 'radio-button-on' : 'radio-button-off'}
                        size={12}
                        color={d.enabled === 1 ? C.success : C.muted}
                      />
                      <Text style={styles.domainText}>{d.domain}</Text>
                      {d.is_custom === 1 && (
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteDomain(d.id)}
                        >
                          <Ionicons name="trash-outline" size={14} color={C.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {/* URL Rules */}
                  {platform.url_rules.length > 0 && (
                    <>
                      <Text style={[styles.expandLabel, { marginTop: 12 }]}>URL Rules</Text>
                      {platform.url_rules.map((rule) => (
                        <View key={rule.id} style={styles.ruleRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.ruleName}>{rule.name}</Text>
                            <Text style={styles.rulePattern}>{rule.pattern}</Text>
                          </View>
                          {loadingId === `rule-${rule.id}` ? (
                            <ActivityIndicator size="small" color={C.primary} />
                          ) : (
                            <Switch
                              value={rule.enabled === 1}
                              onValueChange={() =>
                                handleToggleUrlRule(platform.id, rule.id, rule.enabled)
                              }
                              disabled={sessionLocked}
                              trackColor={{ false: C.border, true: '#1d4ed8' }}
                              thumbColor={rule.enabled === 1 ? C.primary : C.muted}
                              style={{ transform: [{ scale: 0.8 }] }}
                            />
                          )}
                        </View>
                      ))}
                    </>
                  )}

                  {/* Add Custom Domain */}
                  {!sessionLocked && (
                    <View style={styles.addDomainRow}>
                      <TextInput
                        style={styles.addDomainInput}
                        value={newDomain}
                        onChangeText={setNewDomain}
                        placeholder="add-custom.com"
                        placeholderTextColor={C.muted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                      />
                      <TouchableOpacity
                        style={[
                          styles.addDomainBtn,
                          (!newDomain.trim() || addingDomain) && styles.addDomainBtnDisabled,
                        ]}
                        onPress={() => handleAddDomain(platform.id)}
                        disabled={!newDomain.trim() || addingDomain}
                      >
                        {addingDomain ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons name="add" size={18} color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 32 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  screenTitle: { fontSize: 24, fontWeight: '800', color: C.text, flex: 1 },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#78350f33',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#78350f',
  },
  lockBadgeText: { color: C.warning, fontSize: 11, fontWeight: '600' },
  section: { marginBottom: 20 },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingLeft: 4,
  },
  platformCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  platformName: { fontSize: 15, fontWeight: '600', color: C.text },
  textDisabled: { color: C.muted },
  domainCount: { fontSize: 12, color: C.muted, marginTop: 2 },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
  },
  expandLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  domainText: { flex: 1, color: C.text, fontSize: 13, fontFamily: 'monospace' },
  deleteBtn: { padding: 4 },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  ruleName: { fontSize: 13, fontWeight: '600', color: C.text },
  rulePattern: { fontSize: 11, color: C.muted, fontFamily: 'monospace', marginTop: 1 },
  addDomainRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  addDomainInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 10,
    color: C.text,
    fontSize: 13,
  },
  addDomainBtn: {
    backgroundColor: C.primary,
    borderRadius: 8,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDomainBtnDisabled: { opacity: 0.4 },
});

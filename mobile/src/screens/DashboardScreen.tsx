import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation';
import {
  getSession,
  getStatsSummary,
  getDailyStats,
  getTopDomains,
  getHealth,
  startSession,
  stopSession,
  type SessionStatus,
  type StatsSummary,
  type DailyStat,
  type TopDomain,
  type HealthStatus,
} from '../api/client';
import { usePolling } from '../hooks/usePolling';
import StatusBadge from '../components/StatusBadge';
import MiniBarChart from '../components/MiniBarChart';

type Nav = NativeStackNavigationProp<RootStackParamList>;

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

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Blocking Active', color: C.success },
  unlock_pending: { label: 'Unlock Pending', color: C.warning },
  unlocked: { label: 'Temporarily Unlocked', color: C.warning },
  emergency: { label: 'Emergency Access', color: C.danger },
  ended: { label: 'Session Ended', color: C.muted },
};

export default function DashboardScreen() {
  const nav = useNavigation<Nav>();
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [topDomains, setTopDomains] = useState<TopDomain[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [s, st, d, top, h] = await Promise.all([
        getSession(),
        getStatsSummary(),
        getDailyStats(7),
        getTopDomains(),
        getHealth(),
      ]);
      setSession(s);
      setStats(st);
      setDaily(d);
      setTopDomains(top.slice(0, 5));
      setHealth(h);
    } catch {
      // network error — keep stale data
    }
  }, []);

  usePolling(fetchAll, 10_000);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  async function handleStartSession() {
    try {
      await startSession();
      await fetchAll();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Could not start session');
    }
  }

  async function handleStopSession() {
    Alert.alert('Stop Session', 'Are you sure you want to end the blocking session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop Blocking',
        style: 'destructive',
        onPress: async () => {
          try {
            await stopSession();
            await fetchAll();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.error ?? 'Could not stop session');
          }
        },
      },
    ]);
  }

  const sessionState = session?.session?.state;
  const stateInfo = sessionState ? STATE_LABELS[sessionState] : null;
  const emergencyLeft = Math.max(0, 3 - (session?.emergency_used_this_week ?? 0));
  const sessionActive = !!session?.session && sessionState !== 'ended';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      {/* Header */}
      <View style={styles.row}>
        <Text style={styles.screenTitle}>Dashboard</Text>
        {health && <StatusBadge status={health.status} size="sm" />}
      </View>

      {/* Session Card */}
      <View style={styles.card}>
        {sessionActive && stateInfo ? (
          <>
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: stateInfo.color }]} />
              <Text style={[styles.sessionState, { color: stateInfo.color }]}>
                {stateInfo.label}
              </Text>
            </View>
            {session?.session?.started_at && (
              <Text style={styles.sessionMeta}>
                Since {new Date(session.session.started_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}

            <View style={styles.actionRow}>
              {(sessionState === 'active' || sessionState === 'unlocked') && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#1d4ed8' }]}
                  onPress={() => nav.navigate('Unlock')}
                >
                  <Ionicons name="lock-open-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Unlock</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#7f1d1d' }]}
                onPress={() => nav.navigate('Emergency')}
              >
                <Ionicons name="warning-outline" size={16} color="#fca5a5" />
                <Text style={[styles.actionBtnText, { color: '#fca5a5' }]}>
                  Emergency ({emergencyLeft}/3)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#1e293b', borderWidth: 1, borderColor: C.border }]}
                onPress={handleStopSession}
              >
                <Ionicons name="stop-circle-outline" size={16} color={C.muted} />
                <Text style={[styles.actionBtnText, { color: C.muted }]}>Stop</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.noSessionText}>No active blocking session</Text>
            <TouchableOpacity style={styles.startBtn} onPress={handleStartSession}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.startBtnText}>Start Blocking Session</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Stats Row */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard label="Today" value={stats.today} />
          <StatCard label="This Week" value={stats.week} />
          <StatCard label="All Time" value={stats.all_time} />
        </View>
      )}

      {/* 7-Day Chart */}
      {daily.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 7 Days</Text>
          <MiniBarChart data={daily} color={C.primary} />
        </View>
      )}

      {/* Top Blocked Domains */}
      {topDomains.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Blocked Domains</Text>
          {topDomains.map((d, i) => (
            <View key={d.domain} style={styles.domainRow}>
              <Text style={styles.domainRank}>#{i + 1}</Text>
              <Text style={styles.domainName}>{d.domain}</Text>
              <Text style={styles.domainCount}>{d.count.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Health Issues */}
      {health && health.status !== 'active' && health.issues.length > 0 && (
        <View style={[styles.card, styles.alertCard]}>
          <View style={styles.row}>
            <Ionicons name="alert-circle" size={18} color={C.warning} />
            <Text style={[styles.cardTitle, { color: C.warning, marginBottom: 0 }]}>
              Health Issues
            </Text>
          </View>
          {health.issues.map((issue, i) => (
            <Text key={i} style={styles.issueText}>• {issue}</Text>
          ))}
        </View>
      )}

      {/* Schedules shortcut */}
      <TouchableOpacity
        style={[styles.card, styles.scheduleLink]}
        onPress={() => nav.navigate('Schedules')}
      >
        <Ionicons name="calendar-outline" size={20} color={C.primary} />
        <Text style={styles.scheduleLinkText}>Manage Schedules</Text>
        <Ionicons name="chevron-forward" size={16} color={C.muted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  screenTitle: { fontSize: 24, fontWeight: '800', color: C.text, flex: 1 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sessionState: { fontSize: 18, fontWeight: '700' },
  sessionMeta: { color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 16 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  noSessionText: { color: C.muted, fontSize: 15, marginBottom: 16 },
  startBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 4, fontWeight: '600' },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  domainRank: { color: C.muted, fontSize: 12, width: 28, fontWeight: '700' },
  domainName: { flex: 1, color: C.text, fontSize: 13, fontFamily: 'monospace' },
  domainCount: { color: C.muted, fontSize: 12, fontWeight: '600' },
  alertCard: { borderColor: '#78350f' },
  issueText: { color: C.warning, fontSize: 13, marginTop: 8 },
  scheduleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleLinkText: { flex: 1, color: C.text, fontSize: 15, fontWeight: '600' },
});

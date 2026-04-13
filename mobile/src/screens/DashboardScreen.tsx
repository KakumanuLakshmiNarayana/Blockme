import React, {useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '../store/useStore';
import {
  getSession, getStatsSummary, getHealth,
  startSession, stopSession,
} from '../services/api';
import {connectVpn, disconnectVpn, parseWgConfig} from '../services/vpn';
import {storage, StorageKeys} from '../services/storage';

const VPN_STATUS_COLOR: Record<string, string> = {
  connected: '#22c55e',
  connecting: '#eab308',
  disconnected: '#6b7280',
  error: '#ef4444',
};

export default function DashboardScreen() {
  const nav = useNavigation<any>();
  const {sessionData, setSessionData, stats, setStats, vpnStatus, setVpnStatus, healthStatus, setHealthStatus} = useStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const load = useCallback(async () => {
    try {
      const [s, st, h] = await Promise.all([
        getSession(), getStatsSummary(), getHealth(),
      ]);
      setSessionData(s.data);
      setStats(st.data);
      setHealthStatus(h.data.status);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleVpnToggle = async () => {
    if (vpnStatus === 'connected') {
      await disconnectVpn();
      setVpnStatus('disconnected');
    } else {
      const config = storage.getString(StorageKeys.WG_CONFIG);
      if (!config) {
        Alert.alert('No VPN Config', 'Go to Devices to set up VPN on this device.');
        return;
      }
      setVpnStatus('connecting');
      try {
        await connectVpn(parseWgConfig(config));
        setVpnStatus('connected');
      } catch {
        setVpnStatus('error');
        Alert.alert('VPN Error', 'Could not connect VPN tunnel.');
      }
    }
  };

  const handleSessionToggle = async () => {
    if (sessionData?.session) {
      Alert.alert('Stop Session', 'Stopping the session will disengage blocking. Are you sure?', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Stop', style: 'destructive', onPress: async () => { await stopSession(); load(); }},
      ]);
    } else {
      await startSession();
      load();
    }
  };

  const session = sessionData?.session;
  const healthColor = healthStatus === 'active' ? '#22c55e' : healthStatus === 'degraded' ? '#eab308' : '#ef4444';
  const healthLabel = healthStatus === 'active' ? 'Protected' : healthStatus === 'degraded' ? 'Degraded' : 'Broken';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Blockme</Text>
          <View style={[s.healthBadge, {backgroundColor: healthColor + '33', borderColor: healthColor}]}>
            <Text style={[s.healthText, {color: healthColor}]}>{healthLabel}</Text>
          </View>
        </View>

        {/* VPN Card */}
        <TouchableOpacity style={s.vpnCard} onPress={handleVpnToggle} activeOpacity={0.8}>
          <View>
            <Text style={s.vpnLabel}>VPN Tunnel</Text>
            <Text style={[s.vpnStatus, {color: VPN_STATUS_COLOR[vpnStatus] ?? '#6b7280'}]}>
              {vpnStatus.charAt(0).toUpperCase() + vpnStatus.slice(1)}
            </Text>
          </View>
          <View style={[s.vpnBtn, {backgroundColor: vpnStatus === 'connected' ? '#22c55e22' : '#ef444422'}]}>
            <Text style={{fontSize: 28}}>{vpnStatus === 'connected' ? '🔒' : '🔓'}</Text>
          </View>
        </TouchableOpacity>

        {/* Session Card */}
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.cardTitle}>Blocking Session</Text>
            <View style={[s.stateBadge, {backgroundColor: session ? '#22c55e33' : '#6b728033'}]}>
              <Text style={[s.stateText, {color: session ? '#22c55e' : '#6b7280'}]}>
                {session ? session.state.replace('_', ' ').toUpperCase() : 'IDLE'}
              </Text>
            </View>
          </View>
          {session?.locked && (
            <Text style={s.lockedNote}>🔒 Locked — edits disabled</Text>
          )}
          {sessionData && sessionData.wait_remaining_seconds > 0 && (
            <Text style={s.waitNote}>
              Unlock wait: {Math.floor(sessionData.wait_remaining_seconds / 60)}m {sessionData.wait_remaining_seconds % 60}s
            </Text>
          )}
          <TouchableOpacity
            style={[s.sessionBtn, {backgroundColor: session ? '#374151' : '#ef4444'}]}
            onPress={handleSessionToggle}>
            <Text style={s.sessionBtnText}>{session ? 'Stop Session' : 'Start Blocking Session'}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={() => nav.navigate('Unlock')}>
            <Text style={s.actionIcon}>🔓</Text>
            <Text style={s.actionLabel}>Unlock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, {borderColor: '#92400e'}]} onPress={() => nav.navigate('Emergency')}>
            <Text style={s.actionIcon}>🆘</Text>
            <Text style={s.actionLabel}>Emergency</Text>
            <Text style={s.actionSub}>{(sessionData?.emergency_cap ?? 3) - (sessionData?.emergency_used_this_week ?? 0)} left</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => nav.navigate('Devices')}>
            <Text style={s.actionIcon}>📱</Text>
            <Text style={s.actionLabel}>Devices</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            {label: 'Today', value: stats?.today ?? 0},
            {label: 'This Week', value: stats?.week ?? 0},
            {label: 'All Time', value: stats?.all_time ?? 0},
          ].map(item => (
            <View key={item.label} style={s.statCard}>
              <Text style={s.statValue}>{item.value.toLocaleString()}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a0a'},
  scroll: {padding: 20, paddingBottom: 40},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20},
  title: {fontSize: 28, fontWeight: '800', color: '#fff'},
  healthBadge: {borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1},
  healthText: {fontSize: 12, fontWeight: '700'},
  vpnCard: {backgroundColor: '#111', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1f2937', marginBottom: 16},
  vpnLabel: {fontSize: 13, color: '#6b7280', marginBottom: 4},
  vpnStatus: {fontSize: 20, fontWeight: '700'},
  vpnBtn: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center'},
  card: {backgroundColor: '#111', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#1f2937', marginBottom: 16},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  cardTitle: {fontSize: 16, fontWeight: '600', color: '#fff'},
  stateBadge: {borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4},
  stateText: {fontSize: 11, fontWeight: '700'},
  lockedNote: {fontSize: 13, color: '#ef4444', marginBottom: 8},
  waitNote: {fontSize: 13, color: '#eab308', marginBottom: 8},
  sessionBtn: {borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8},
  sessionBtnText: {color: '#fff', fontWeight: '700', fontSize: 15},
  actions: {flexDirection: 'row', gap: 12, marginBottom: 16},
  actionBtn: {flex: 1, backgroundColor: '#111', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1f2937'},
  actionIcon: {fontSize: 24, marginBottom: 6},
  actionLabel: {color: '#fff', fontSize: 13, fontWeight: '600'},
  actionSub: {color: '#9ca3af', fontSize: 11, marginTop: 2},
  statsRow: {flexDirection: 'row', gap: 12},
  statCard: {flex: 1, backgroundColor: '#111', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1f2937'},
  statValue: {fontSize: 22, fontWeight: '800', color: '#ef4444'},
  statLabel: {fontSize: 11, color: '#6b7280', marginTop: 4},
});

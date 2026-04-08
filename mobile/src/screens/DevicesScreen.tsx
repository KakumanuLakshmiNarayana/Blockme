import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import {
  getDevices,
  addDevice,
  deleteDevice,
  type Device,
  type DeviceCreated,
} from '../api/client';
import { usePolling } from '../hooks/usePolling';

const C = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  primary: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444',
  text: '#f8fafc',
  muted: '#94a3b8',
};

const OS_INSTRUCTIONS: { os: string; icon: string; steps: string[] }[] = [
  {
    os: 'iOS',
    icon: 'logo-apple',
    steps: [
      'Install WireGuard from the App Store',
      'Tap "Add a tunnel" → "Create from QR code"',
      'Scan the QR code shown above',
      'Enable "On Demand" in the tunnel settings for auto-reconnect',
    ],
  },
  {
    os: 'Android',
    icon: 'logo-android',
    steps: [
      'Install WireGuard from the Play Store',
      'Tap "+" → "Scan from QR code"',
      'Scan the QR code shown above',
    ],
  },
  {
    os: 'macOS / Windows',
    icon: 'desktop-outline',
    steps: [
      'Install WireGuard from wireguard.com',
      'Click "Import tunnel(s) from file"',
      'Use the downloaded .conf file',
    ],
  },
];

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);
  const [newDevice, setNewDevice] = useState<DeviceCreated | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      const list = await getDevices();
      setDevices(list);
    } catch {
      /* ignore */
    }
  }, []);

  usePolling(fetchDevices, 30_000);

  async function onRefresh() {
    setRefreshing(true);
    await fetchDevices();
    setRefreshing(false);
  }

  async function handleAddDevice() {
    const name = addName.trim();
    if (!name) {
      Alert.alert('Name Required', 'Enter a name for this device (e.g. iPhone, Work Laptop).');
      return;
    }
    setAdding(true);
    try {
      const created = await addDevice(name);
      setNewDevice(created);
      setAddName('');
      await fetchDevices();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Failed to add device.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(device: Device) {
    Alert.alert(
      'Remove Device',
      `Remove "${device.name}" from the VPN? It will lose access to Blockme.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDevice(device.id);
              await fetchDevices();
            } catch {
              Alert.alert('Error', 'Failed to remove device.');
            }
          },
        },
      ]
    );
  }

  function formatLastSeen(lastSeen: string | null) {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return date.toLocaleDateString();
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <Text style={styles.screenTitle}>Devices</Text>
      <Text style={styles.subtitle}>
        Each device needs a WireGuard VPN profile to route traffic through Blockme.
      </Text>

      {/* Add Device Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add New Device</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={addName}
            onChangeText={setAddName}
            placeholder="Device name (e.g. iPhone 15)"
            placeholderTextColor={C.muted}
            returnKeyType="done"
            onSubmitEditing={handleAddDevice}
            editable={!adding}
          />
          <TouchableOpacity
            style={[styles.addBtn, (adding || !addName.trim()) && styles.addBtnDisabled]}
            onPress={handleAddDevice}
            disabled={adding || !addName.trim()}
          >
            {adding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="add" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* New Device QR Modal */}
      {newDevice && (
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
            <Text style={[styles.cardTitle, { color: C.success, marginBottom: 0 }]}>
              {newDevice.name} Added
            </Text>
          </View>
          <Text style={styles.qrInstructions}>
            Scan this QR code with the WireGuard app on your device:
          </Text>

          <View style={styles.qrWrapper}>
            <QRCode
              value={newDevice.config}
              size={220}
              backgroundColor="#fff"
              color="#000"
            />
          </View>

          <Text style={styles.vpnIp}>VPN IP: {newDevice.vpn_ip}</Text>

          <TouchableOpacity
            style={styles.instructionsToggle}
            onPress={() => setShowInstructions((v) => !v)}
          >
            <Ionicons
              name={showInstructions ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={C.primary}
            />
            <Text style={styles.instructionsToggleText}>
              {showInstructions ? 'Hide' : 'Show'} setup instructions
            </Text>
          </TouchableOpacity>

          {showInstructions && (
            <View style={styles.instructions}>
              {OS_INSTRUCTIONS.map(({ os, icon, steps }) => (
                <View key={os} style={styles.osBlock}>
                  <View style={styles.osHeader}>
                    <Ionicons name={icon as any} size={16} color={C.primary} />
                    <Text style={styles.osName}>{os}</Text>
                  </View>
                  {steps.map((s, i) => (
                    <Text key={i} style={styles.step}>
                      {i + 1}. {s}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.dismissBtn} onPress={() => setNewDevice(null)}>
            <Text style={styles.dismissBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Device List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connected Devices ({devices.length})</Text>

        {devices.length === 0 ? (
          <Text style={styles.emptyText}>No devices added yet.</Text>
        ) : (
          devices.map((device, i) => (
            <View
              key={device.id}
              style={[
                styles.deviceRow,
                i < devices.length - 1 && styles.deviceRowBorder,
              ]}
            >
              <View style={styles.deviceIcon}>
                <Ionicons name="phone-portrait-outline" size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceMeta}>
                  {device.vpn_ip} · Last seen: {formatLastSeen(device.last_seen)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(device)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={18} color={C.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Tips */}
      <View style={[styles.card, styles.tipsCard]}>
        <Ionicons name="information-circle-outline" size={18} color={C.primary} />
        <Text style={styles.tipsText}>
          Configure WireGuard with <Text style={{ fontWeight: '700' }}>"On Demand"</Text> mode on
          iOS/Android so it auto-reconnects after network changes. This prevents accidental bypass.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 18 },
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
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    color: C.text,
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  qrCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: C.success,
    marginBottom: 12,
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  qrInstructions: { color: C.muted, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
  },
  vpnIp: {
    color: C.muted,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  instructionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  instructionsToggleText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  instructions: { alignSelf: 'stretch', marginTop: 8 },
  osBlock: { marginBottom: 16 },
  osHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  osName: { fontSize: 13, fontWeight: '700', color: C.text },
  step: { fontSize: 12, color: C.muted, lineHeight: 18, paddingLeft: 4 },
  dismissBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  dismissBtnText: { color: C.text, fontSize: 14, fontWeight: '600' },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  deviceRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  deviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1d3461',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: { fontSize: 15, fontWeight: '600', color: C.text },
  deviceMeta: { fontSize: 12, color: C.muted, marginTop: 2, fontFamily: 'monospace' },
  deleteBtn: { padding: 8 },
  emptyText: { color: C.muted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  tipsCard: { flexDirection: 'row', gap: 10, borderColor: '#1d3461' },
  tipsText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 18 },
});

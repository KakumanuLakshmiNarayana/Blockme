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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getSettings,
  updateSettings,
  changePassword,
  clearStats,
  type Settings,
} from '../api/client';
import { useAuth } from '../contexts/AuthContext';
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

export default function SettingsScreen() {
  const { logout, serverUrl } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Settings edits
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      setSettings(s);
    } catch {
      /* ignore */
    }
  }, []);

  usePolling(fetchSettings, 60_000);

  async function onRefresh() {
    setRefreshing(true);
    await fetchSettings();
    setRefreshing(false);
  }

  function startEdit(key: string, value: string) {
    setEditingKey(key);
    setEditValue(value);
  }

  async function saveEdit() {
    if (!editingKey || !settings) return;
    setSavingKey(editingKey);
    try {
      await updateSettings({ [editingKey]: editValue.trim() });
      setSettings((s) => (s ? { ...s, [editingKey]: editValue.trim() } : s));
      setEditingKey(null);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Failed to save setting.');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Missing Fields', 'Fill in all password fields.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (newPw.length < 8) {
      Alert.alert('Too Short', 'New password must be at least 8 characters.');
      return;
    }
    setChangingPw(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      Alert.alert('Success', 'Password changed. You will remain logged in on this device.');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Failed to change password.');
    } finally {
      setChangingPw(false);
    }
  }

  async function handleClearStats() {
    Alert.alert(
      'Clear All Statistics',
      'This will delete all block statistics permanently. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Stats',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearStats();
              Alert.alert('Done', 'Statistics cleared.');
            } catch {
              Alert.alert('Error', 'Failed to clear statistics.');
            }
          },
        },
      ]
    );
  }

  async function handleLogout() {
    Alert.alert('Disconnect', 'This will remove your session from this device. Your server will keep running.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  }

  const EMERGENCY_CAP_OPTIONS = ['3', '5', '10'];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
    >
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Server Info */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Connected Server</Text>
        <View style={styles.infoRow}>
          <Ionicons name="server-outline" size={16} color={C.primary} />
          <Text style={styles.infoText} numberOfLines={1}>{serverUrl}</Text>
        </View>
      </View>

      {/* Server Settings */}
      {settings && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Server Configuration</Text>

          <SettingRow
            label="Server IP (for WireGuard configs)"
            value={settings.server_ip || ''}
            editingKey={editingKey}
            settingKey="server_ip"
            editValue={editValue}
            savingKey={savingKey}
            onStartEdit={startEdit}
            onEditChange={setEditValue}
            onSave={saveEdit}
            onCancel={() => setEditingKey(null)}
          />

          <SettingRow
            label="Upstream DNS"
            value={settings.upstream_dns || '8.8.8.8'}
            editingKey={editingKey}
            settingKey="upstream_dns"
            editValue={editValue}
            savingKey={savingKey}
            onStartEdit={startEdit}
            onEditChange={setEditValue}
            onSave={saveEdit}
            onCancel={() => setEditingKey(null)}
          />

          <SettingRow
            label="NTP Server"
            value={settings.ntp_server || 'pool.ntp.org'}
            editingKey={editingKey}
            settingKey="ntp_server"
            editValue={editValue}
            savingKey={savingKey}
            onStartEdit={startEdit}
            onEditChange={setEditValue}
            onSave={saveEdit}
            onCancel={() => setEditingKey(null)}
          />

          <SettingRow
            label="Health Webhook URL"
            value={settings.webhook_url || ''}
            editingKey={editingKey}
            settingKey="webhook_url"
            editValue={editValue}
            savingKey={savingKey}
            onStartEdit={startEdit}
            onEditChange={setEditValue}
            onSave={saveEdit}
            onCancel={() => setEditingKey(null)}
            placeholder="https://your-webhook.com"
          />
        </View>
      )}

      {/* Emergency Cap */}
      {settings && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Emergency Access Cap (per week)</Text>
          <View style={styles.capRow}>
            {EMERGENCY_CAP_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.capOption,
                  settings.emergency_cap_weekly === opt && styles.capOptionActive,
                ]}
                onPress={async () => {
                  try {
                    await updateSettings({ emergency_cap_weekly: opt });
                    setSettings((s) => (s ? { ...s, emergency_cap_weekly: opt } : s));
                  } catch {
                    Alert.alert('Error', 'Failed to update cap.');
                  }
                }}
              >
                <Text
                  style={[
                    styles.capOptionText,
                    settings.emergency_cap_weekly === opt && styles.capOptionTextActive,
                  ]}
                >
                  {opt} / week
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Change Password */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Change Password</Text>
        <TextInput
          style={styles.input}
          value={currentPw}
          onChangeText={setCurrentPw}
          placeholder="Current password"
          placeholderTextColor={C.muted}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={newPw}
          onChangeText={setNewPw}
          placeholder="New password (min 8 chars)"
          placeholderTextColor={C.muted}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={confirmPw}
          onChangeText={setConfirmPw}
          placeholder="Confirm new password"
          placeholderTextColor={C.muted}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.saveBtn, changingPw && styles.saveBtnDisabled]}
          onPress={handleChangePassword}
          disabled={changingPw}
        >
          {changingPw ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.sectionLabel, { color: C.danger }]}>Danger Zone</Text>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearStats}>
          <Ionicons name="trash-outline" size={16} color={C.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerBtnTitle}>Clear Statistics</Text>
            <Text style={styles.dangerBtnSub}>Permanently delete all block statistics</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color={C.danger} />
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerBtnTitle}>Disconnect</Text>
            <Text style={styles.dangerBtnSub}>Remove server connection from this device</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Blockme v1.0.0</Text>
    </ScrollView>
  );
}

function SettingRow({
  label,
  value,
  settingKey,
  editingKey,
  editValue,
  savingKey,
  onStartEdit,
  onEditChange,
  onSave,
  onCancel,
  placeholder,
}: {
  label: string;
  value: string;
  settingKey: string;
  editingKey: string | null;
  editValue: string;
  savingKey: string | null;
  onStartEdit: (key: string, value: string) => void;
  onEditChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const isEditing = editingKey === settingKey;
  const isSaving = savingKey === settingKey;

  return (
    <View style={srStyles.row}>
      <Text style={srStyles.label}>{label}</Text>
      {isEditing ? (
        <View style={srStyles.editRow}>
          <TextInput
            style={srStyles.input}
            value={editValue}
            onChangeText={onEditChange}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={placeholder}
            placeholderTextColor="#64748b"
          />
          <TouchableOpacity style={srStyles.saveBtn} onPress={onSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={srStyles.cancelBtn} onPress={onCancel}>
            <Ionicons name="close" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={srStyles.valueRow} onPress={() => onStartEdit(settingKey, value)}>
          <Text style={srStyles.value} numberOfLines={1}>
            {value || placeholder || '—'}
          </Text>
          <Ionicons name="pencil-outline" size={14} color="#64748b" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const srStyles = StyleSheet.create({
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { flex: 1, color: '#f8fafc', fontSize: 14, fontFamily: 'monospace' },
  editRow: { flexDirection: 'row', gap: 6 },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 8,
    color: '#f8fafc',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderRadius: 8,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 16 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { flex: 1, color: C.text, fontSize: 13, fontFamily: 'monospace' },
  capRow: { flexDirection: 'row', gap: 8 },
  capOption: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  capOptionActive: { backgroundColor: '#1d4ed8', borderColor: C.primary },
  capOptionText: { fontSize: 13, color: C.muted, fontWeight: '600' },
  capOptionTextActive: { color: '#fff' },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    color: C.text,
    fontSize: 14,
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dangerCard: { borderColor: '#7f1d1d' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  dangerBtnTitle: { fontSize: 14, fontWeight: '600', color: C.danger },
  dangerBtnSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  version: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
});

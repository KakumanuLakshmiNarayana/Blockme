import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

import { getSession, requestEmergency } from '../api/client';
import CountdownTimer from '../components/CountdownTimer';

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

const ESSENTIAL_DOMAINS = [
  'meet.google.com',
  'zoom.us',
  'facetime.apple.com',
  'maps.google.com',
  'waze.com',
  'apple.com/maps',
];

const CONFIRM_WORD = 'EMERGENCY';

export default function EmergencyScreen() {
  const nav = useNavigation();
  const [emergencyUsed, setEmergencyUsed] = useState(0);
  const [cap, setCap] = useState(3);
  const [reason, setReason] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    getSession()
      .then((s) => {
        setEmergencyUsed(s.emergency_used_this_week);
      })
      .catch(() => {});
  }, []);

  const remaining = Math.max(0, cap - emergencyUsed);
  const canActivate =
    remaining > 0 &&
    reason.trim().length >= 5 &&
    confirmWord.trim() === CONFIRM_WORD;

  async function handleActivate() {
    if (!canActivate) return;

    Alert.alert(
      'Confirm Emergency Access',
      `This will use 1 of your ${remaining} remaining emergency unlocks this week.\n\nEssential apps only — social media stays blocked.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await requestEmergency(reason.trim());
              setExpiresAt(res.expires_at);
              setActivated(true);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (e: any) {
              const msg =
                e?.response?.data?.error ??
                'Could not activate emergency access. You may have reached the weekly cap.';
              Alert.alert('Error', msg);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  // ── Activated State ─────────────────────────────────────────────────────────
  if (activated && expiresAt) {
    const expiresIn = Math.max(
      0,
      Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
    );
    return (
      <View style={[styles.root, styles.centered]}>
        <Ionicons name="warning" size={56} color={C.warning} />
        <Text style={[styles.bigTitle, { color: C.warning }]}>Emergency Active</Text>
        <Text style={styles.emergencyNote}>
          Essential apps are accessible. Social media remains blocked.
        </Text>
        <Text style={styles.timerLabel}>Auto-relocks in</Text>
        <CountdownTimer
          totalSeconds={expiresIn}
          color={C.danger}
          onComplete={() => nav.goBack()}
        />

        <View style={styles.domainListCard}>
          <Text style={styles.sectionLabel}>Accessible domains</Text>
          {ESSENTIAL_DOMAINS.map((d) => (
            <View key={d} style={styles.domainRow}>
              <Ionicons name="checkmark-circle" size={14} color={C.success} />
              <Text style={styles.domainText}>{d}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.doneBtn} onPress={() => nav.goBack()}>
          <Text style={styles.doneBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form State ──────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Cap indicator */}
      <View style={[styles.capCard, remaining === 0 && styles.capCardEmpty]}>
        <Text style={[styles.capCount, { color: remaining > 0 ? C.warning : C.danger }]}>
          {remaining}
        </Text>
        <Text style={styles.capLabel}>emergency unlocks remaining this week</Text>
      </View>

      {remaining === 0 ? (
        <View style={styles.card}>
          <Ionicons name="lock-closed" size={32} color={C.danger} style={{ marginBottom: 12 }} />
          <Text style={[styles.sectionTitle, { color: C.danger }]}>Weekly Cap Reached</Text>
          <Text style={styles.helpText}>
            You've used all {cap} emergency unlocks this week. The cap resets on Monday.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <Ionicons name="alert-circle" size={20} color={C.warning} />
            <Text style={styles.warningText}>
              Emergency access is for genuine urgent needs only.{'\n'}
              Social media will remain blocked — only essential apps are accessible.
            </Text>
          </View>

          {/* Essential domains */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>What gets unlocked</Text>
            {ESSENTIAL_DOMAINS.map((d) => (
              <View key={d} style={styles.domainRow}>
                <Ionicons name="checkmark-circle" size={14} color={C.success} />
                <Text style={styles.domainText}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Reason */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Reason for emergency access</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Briefly describe why you need emergency access..."
              placeholderTextColor={C.muted}
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{reason.length}/200</Text>
          </View>

          {/* Confirm word */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>
              Type <Text style={{ color: C.danger, fontWeight: '800' }}>{CONFIRM_WORD}</Text> to confirm
            </Text>
            <TextInput
              style={[
                styles.confirmInput,
                confirmWord.length > 0 &&
                  confirmWord !== CONFIRM_WORD &&
                  styles.confirmInputError,
                confirmWord === CONFIRM_WORD && styles.confirmInputOk,
              ]}
              value={confirmWord}
              onChangeText={setConfirmWord}
              placeholder={CONFIRM_WORD}
              placeholderTextColor={C.muted}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.activateBtn, !canActivate && styles.activateBtnDisabled]}
            onPress={handleActivate}
            disabled={!canActivate || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="warning-outline" size={18} color="#fff" />
                <Text style={styles.activateBtnText}>Activate Emergency Access</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footNote}>
            This uses 1 of {remaining} remaining emergency unlocks.{'\n'}
            Access expires in 30 minutes.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flexGrow: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  capCard: {
    backgroundColor: '#78350f33',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#78350f',
    marginBottom: 12,
  },
  capCardEmpty: { backgroundColor: '#7f1d1d33', borderColor: C.danger },
  capCount: { fontSize: 48, fontWeight: '800', lineHeight: 54 },
  capLabel: { color: C.muted, fontSize: 13, marginTop: 4 },
  warningBanner: {
    backgroundColor: '#78350f22',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#78350f',
  },
  warningText: { flex: 1, color: C.warning, fontSize: 13, lineHeight: 18 },
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 8 },
  helpText: { color: C.muted, fontSize: 14, lineHeight: 20 },
  domainRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  domainText: { color: C.text, fontSize: 13, fontFamily: 'monospace' },
  domainListCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginVertical: 20,
    alignSelf: 'stretch',
  },
  reasonInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 14,
    color: C.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { color: C.muted, fontSize: 11, marginTop: 6, textAlign: 'right' },
  confirmInput: {
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 10,
    padding: 14,
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  confirmInputError: { borderColor: C.danger },
  confirmInputOk: { borderColor: C.success },
  activateBtn: {
    backgroundColor: C.danger,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activateBtnDisabled: { opacity: 0.3 },
  activateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footNote: { color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  bigTitle: { fontSize: 28, fontWeight: '800', marginVertical: 12, textAlign: 'center' },
  emergencyNote: {
    color: C.muted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
    lineHeight: 20,
  },
  timerLabel: { color: C.muted, fontSize: 13, marginBottom: 4 },
  backBtn: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  backBtnText: { color: C.text, fontSize: 15, fontWeight: '600' },
  doneBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  doneBtnText: { color: C.text, fontSize: 15, fontWeight: '600' },
});

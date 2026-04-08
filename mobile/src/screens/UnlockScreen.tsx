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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

import { getBlocklist, requestUnlock, confirmUnlock, type Platform } from '../api/client';
import { usePolling } from '../hooks/usePolling';
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

type Step = 'select' | 'waiting' | 'typing' | 'unlocked';

interface UnlockState {
  platform: Platform;
  waitSeconds: number;
  phrase: string;
  attempt: number;
  expiresAt: string | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  social: 'people',
  video: 'play-circle',
  messaging: 'chatbubble',
  professional: 'briefcase',
};

export default function UnlockScreen() {
  const nav = useNavigation();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [step, setStep] = useState<Step>('select');
  const [unlock, setUnlock] = useState<UnlockState | null>(null);
  const [typedPhrase, setTypedPhrase] = useState('');
  const [phraseError, setPhraseError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitDone, setWaitDone] = useState(false);

  const fetchPlatforms = useCallback(async () => {
    try {
      const list = await getBlocklist();
      setPlatforms(list.filter((p) => p.enabled === 1));
    } catch {
      /* ignore */
    }
  }, []);

  usePolling(fetchPlatforms, 30_000, step === 'select');

  async function handleSelectPlatform(platform: Platform) {
    setLoading(true);
    try {
      const res = await requestUnlock(platform.id);
      setUnlock({
        platform,
        waitSeconds: res.wait_seconds,
        phrase: res.phrase,
        attempt: res.attempt,
        expiresAt: null,
      });
      setWaitDone(res.wait_seconds === 0);
      setStep('waiting');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Could not start unlock request.');
    } finally {
      setLoading(false);
    }
  }

  function handleWaitComplete() {
    setWaitDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStep('typing');
  }

  async function handleConfirmPhrase() {
    if (!typedPhrase.trim()) return;
    setLoading(true);
    try {
      const res = await confirmUnlock(typedPhrase);
      setUnlock((u) => u ? { ...u, expiresAt: res.expires_at } : u);
      setStep('unlocked');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setPhraseError(true);
      setTypedPhrase('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e?.response?.data?.error ?? 'Phrase does not match. Try again.';
      Alert.alert('Wrong Phrase', msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDone() {
    nav.goBack();
  }

  // ── Step: Select Platform ───────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <View style={styles.root}>
        <Text style={styles.stepHint}>Which platform do you want to unlock?</Text>
        <Text style={styles.stepSub}>
          Unlocking one platform does not affect others. Each unlock adds to your daily attempt count.
        </Text>
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={platforms}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={styles.platformList}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({ item: p }) => (
              <TouchableOpacity
                style={styles.platformRow}
                onPress={() => handleSelectPlatform(p)}
                activeOpacity={0.7}
              >
                <View style={styles.platformIcon}>
                  <Ionicons
                    name={(CATEGORY_ICONS[p.category] ?? 'globe') as any}
                    size={20}
                    color={C.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.platformName}>{p.name}</Text>
                  <Text style={styles.platformCategory}>{p.category}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.muted} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  if (!unlock) return null;

  // ── Step: Waiting Room ──────────────────────────────────────────────────────
  if (step === 'waiting') {
    const attemptColors = ['#22c55e', '#f59e0b', '#f97316', '#ef4444'];
    const attemptColor = attemptColors[Math.min(unlock.attempt - 1, 3)] ?? C.danger;
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.centeredContent}>
        <Text style={styles.platformBig}>{unlock.platform.name}</Text>

        <View style={[styles.attemptBadge, { borderColor: attemptColor }]}>
          <Text style={[styles.attemptText, { color: attemptColor }]}>
            Attempt #{unlock.attempt} today
          </Text>
        </View>

        <View style={styles.timerWrap}>
          {unlock.waitSeconds > 0 ? (
            <>
              <Text style={styles.waitLabel}>Wait before you can proceed</Text>
              <CountdownTimer
                totalSeconds={unlock.waitSeconds}
                onComplete={handleWaitComplete}
                color={attemptColor}
              />
              <Text style={styles.waitSub}>
                Use this time to ask yourself if you really need this.
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={64} color={C.success} />
              <Text style={[styles.waitLabel, { color: C.success }]}>Ready to proceed</Text>
              <TouchableOpacity
                style={styles.proceedBtn}
                onPress={() => setStep('typing')}
              >
                <Text style={styles.proceedBtnText}>Continue to Phrase</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {unlock.waitSeconds > 0 && !waitDone && (
          <Text style={styles.noBackMsg}>
            Closing this screen will not cancel your wait.
          </Text>
        )}
      </ScrollView>
    );
  }

  // ── Step: Type Phrase ───────────────────────────────────────────────────────
  if (step === 'typing') {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.centeredContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.platformBig}>{unlock.platform.name}</Text>

        <View style={styles.phraseCard}>
          <Text style={styles.phraseLabel}>Type this phrase exactly:</Text>
          <Text style={styles.phraseText}>{unlock.phrase}</Text>
        </View>

        <TextInput
          style={[styles.phraseInput, phraseError && styles.phraseInputError]}
          value={typedPhrase}
          onChangeText={(t) => {
            setTypedPhrase(t);
            setPhraseError(false);
          }}
          placeholder="Type the phrase above..."
          placeholderTextColor={C.muted}
          multiline
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
        />

        {phraseError && (
          <Text style={styles.phraseErrorText}>
            Phrase doesn't match. Timer is still running — try again.
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (loading || !typedPhrase.trim()) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirmPhrase}
          disabled={loading || !typedPhrase.trim()}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-open" size={18} color="#fff" />
              <Text style={styles.confirmBtnText}>Confirm Unlock</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.phraseHint}>
          Phrase is case-sensitive and must match exactly.
        </Text>
      </ScrollView>
    );
  }

  // ── Step: Unlocked ──────────────────────────────────────────────────────────
  if (step === 'unlocked' && unlock.expiresAt) {
    const expiresIn = Math.max(
      0,
      Math.floor((new Date(unlock.expiresAt).getTime() - Date.now()) / 1000)
    );
    return (
      <View style={[styles.root, styles.centeredContent]}>
        <Ionicons name="lock-open-outline" size={64} color={C.success} />
        <Text style={[styles.platformBig, { color: C.success }]}>
          {unlock.platform.name} Unlocked
        </Text>
        <Text style={styles.waitSub}>Auto-relocks in</Text>
        <CountdownTimer
          totalSeconds={expiresIn}
          onComplete={handleDone}
          color={C.warning}
        />
        <Text style={styles.autoRelockNote}>
          Access expires automatically. Blocking re-engages at 00:00.
        </Text>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  centeredContent: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHint: { fontSize: 20, fontWeight: '700', color: C.text, padding: 16, paddingBottom: 8 },
  stepSub: { fontSize: 13, color: C.muted, paddingHorizontal: 16, paddingBottom: 8, lineHeight: 18 },
  platformList: { padding: 16 },
  sep: { height: 1, backgroundColor: C.border },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  platformIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1d3461',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformName: { fontSize: 16, fontWeight: '600', color: C.text },
  platformCategory: { fontSize: 12, color: C.muted, marginTop: 2, textTransform: 'capitalize' },
  platformBig: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  attemptBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 32,
  },
  attemptText: { fontSize: 13, fontWeight: '700' },
  timerWrap: { alignItems: 'center', gap: 12, marginBottom: 24 },
  waitLabel: {
    fontSize: 15,
    color: C.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitSub: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  noBackMsg: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    marginTop: 24,
  },
  proceedBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  proceedBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  phraseCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    width: '100%',
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  phraseLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  phraseText: {
    fontSize: 16,
    color: C.text,
    fontWeight: '600',
    lineHeight: 24,
  },
  phraseInput: {
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    color: C.text,
    fontSize: 15,
    alignSelf: 'stretch',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  phraseInputError: { borderColor: C.danger },
  phraseErrorText: { color: C.danger, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  confirmBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  phraseHint: { color: C.muted, fontSize: 12, textAlign: 'center' },
  autoRelockNote: {
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
    maxWidth: 260,
    lineHeight: 18,
  },
  doneBtn: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  doneBtnText: { color: C.text, fontSize: 15, fontWeight: '600' },
});

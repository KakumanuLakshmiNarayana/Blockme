import React, {useState, useEffect} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Vibration,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {getBlocklist, requestUnlock, confirmUnlock, getSession} from '../services/api';

interface Platform {id: number; name: string; category: string; enabled: number}

type Step = 'select' | 'waiting' | 'phrase' | 'done';

export default function UnlockScreen() {
  const nav = useNavigation();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selected, setSelected] = useState<Platform | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [countdown, setCountdown] = useState(0);
  const [phrase, setPhrase] = useState('');
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const [unlockUntil, setUnlockUntil] = useState('');
  const [sessionLocked, setSessionLocked] = useState(false);

  useEffect(() => {
    getBlocklist().then(r => setPlatforms(r.data.platforms.filter((p: Platform) => p.enabled)));
    getSession().then(r => setSessionLocked(!!r.data.session?.locked));
  }, []);

  // Countdown timer
  useEffect(() => {
    if (step !== 'waiting' || countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {setStep('phrase'); return 0;}
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step, countdown]);

  const handleRequest = async () => {
    if (!selected) return;
    if (!sessionLocked) {
      Alert.alert('No Active Session', 'Start a blocking session first from the Dashboard.');
      return;
    }
    setLoading(true);
    try {
      const res = await requestUnlock(selected.id);
      setCountdown(res.data.wait_seconds);
      setPhrase(res.data.phrase);
      setStep('waiting');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Request failed');
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (typed.trim() !== phrase) {
      Vibration.vibrate(400);
      Alert.alert('Wrong Phrase', 'The phrase does not match. Try again carefully.');
      setTyped('');
      return;
    }
    setLoading(true);
    try {
      const res = await confirmUnlock(typed.trim());
      setUnlockUntil(new Date(res.data.unlocked_until).toLocaleTimeString());
      setStep('done');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Confirmation failed');
    } finally { setLoading(false); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>

        {step === 'select' && (
          <>
            <Text style={s.title}>Unlock Request</Text>
            <Text style={s.desc}>Choose a single platform. Others remain blocked. Auto-relock in 15 min.</Text>
            <View style={s.grid}>
              {platforms.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[s.platformBtn, selected?.id === p.id && s.platformBtnSelected]}
                  onPress={() => setSelected(p)}>
                  <Text style={[s.platformName, selected?.id === p.id && {color: '#fff'}]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[s.btn, (!selected || loading) && s.btnDisabled]}
              onPress={handleRequest} disabled={!selected || loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Begin Unlock for {selected?.name ?? '...'}</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 'waiting' && (
          <View style={s.center}>
            <Text style={s.waitLabel}>Wait room</Text>
            <Text style={s.timer}>{fmt(countdown)}</Text>
            <Text style={s.waitDesc}>You must wait before unlocking. This is intentional.</Text>
            <Text style={s.waitSubtext}>Attempting to unlock more times today means longer waits.</Text>
            {countdown === 0 && (
              <TouchableOpacity style={s.btn} onPress={() => setStep('phrase')}>
                <Text style={s.btnText}>Continue to Phrase</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {step === 'phrase' && (
          <>
            <Text style={s.title}>Type the phrase exactly</Text>
            <View style={s.phraseBox}>
              <Text style={s.phraseText} selectable>{phrase}</Text>
            </View>
            <TextInput
              style={s.input}
              value={typed}
              onChangeText={setTyped}
              placeholder="Type phrase here..."
              placeholderTextColor="#4b5563"
              multiline
              autoFocus
            />
            <TouchableOpacity style={[s.btn, (!typed || loading) && s.btnDisabled]} onPress={handleConfirm} disabled={!typed || loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Confirm Unlock</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 'done' && (
          <View style={s.center}>
            <Text style={s.doneIcon}>✅</Text>
            <Text style={s.doneTitle}>{selected?.name} Unlocked</Text>
            <Text style={s.doneDesc}>Access expires at {unlockUntil}. Auto-relock will engage. Other platforms remain blocked.</Text>
            <TouchableOpacity style={s.btn} onPress={() => nav.goBack()}>
              <Text style={s.btnText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a0a'},
  scroll: {padding: 24, flexGrow: 1},
  title: {fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8},
  desc: {fontSize: 14, color: '#9ca3af', marginBottom: 24, lineHeight: 20},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24},
  platformBtn: {paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#374151', backgroundColor: '#111'},
  platformBtnSelected: {borderColor: '#ef4444', backgroundColor: '#7f1d1d33'},
  platformName: {color: '#9ca3af', fontWeight: '600'},
  btn: {backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 16, alignItems: 'center'},
  btnDisabled: {opacity: 0.4},
  btnText: {color: '#fff', fontWeight: '700', fontSize: 16},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16},
  waitLabel: {fontSize: 16, color: '#eab308', fontWeight: '700'},
  timer: {fontSize: 72, fontWeight: '800', color: '#eab308', fontVariant: ['tabular-nums']},
  waitDesc: {fontSize: 15, color: '#9ca3af', textAlign: 'center'},
  waitSubtext: {fontSize: 12, color: '#4b5563', textAlign: 'center'},
  phraseBox: {backgroundColor: '#1c1917', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#78350f'},
  phraseText: {color: '#fbbf24', fontFamily: 'monospace', fontSize: 14, lineHeight: 22},
  input: {backgroundColor: '#1f2937', borderRadius: 14, padding: 16, color: '#fff', fontSize: 14, minHeight: 80, marginBottom: 16, fontFamily: 'monospace', textAlignVertical: 'top'},
  doneIcon: {fontSize: 56},
  doneTitle: {fontSize: 24, fontWeight: '700', color: '#22c55e'},
  doneDesc: {fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22},
});

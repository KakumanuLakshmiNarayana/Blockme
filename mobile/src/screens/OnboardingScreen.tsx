import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '../store/useStore';
import {login, addDevice, getSettings} from '../services/api';
import {connectVpn, parseWgConfig} from '../services/vpn';
import {storage, StorageKeys} from '../services/storage';
import {resetApi, configureApiToken} from '../services/api';

export default function OnboardingScreen() {
  const {setServerUrl, setToken, setOnboarded} = useStore();
  const [step, setStep] = useState<'server' | 'login' | 'setup'>('server');
  const [serverUrl, setServerUrlLocal] = useState('http://');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setTokenLocal] = useState('');

  const handleServerConnect = async () => {
    const url = serverUrl.trim().replace(/\/$/, '');
    if (!url.startsWith('http')) {
      Alert.alert('Invalid URL', 'Enter a valid URL starting with http:// or https://');
      return;
    }
    setLoading(true);
    try {
      resetApi(url);
      await getSettings(); // Test connection
      setServerUrl(url);
      setStep('login');
    } catch {
      Alert.alert('Connection Failed', 'Could not reach the Blockme server. Check the URL and ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await login(password);
      const t = res.data.token;
      setTokenLocal(t);
      configureApiToken(t);
      setStep('setup');
    } catch {
      Alert.alert('Login Failed', 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    try {
      // Add this phone as a VPN device
      const deviceName = `Mobile (${new Date().toLocaleDateString()})`;
      const res = await addDevice(deviceName);
      const {config} = res.data;

      // Parse and store WireGuard config
      storage.set(StorageKeys.WG_CONFIG, config);
      storage.set(StorageKeys.DEVICE_ID, String(res.data.device.id));

      // Connect VPN
      const vpnConfig = parseWgConfig(config);
      await connectVpn(vpnConfig);

      // Complete onboarding
      setToken(token);
      setOnboarded();
    } catch (err: any) {
      Alert.alert('Setup Failed', err.message || 'Could not configure VPN');
    } finally {
      setLoading(false);
    }
  };

  const skipVpnSetup = () => {
    setToken(token);
    setOnboarded();
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.logo}>Blockme</Text>
        <Text style={s.tagline}>No-turn-back social media blocker</Text>

        {step === 'server' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Connect to your server</Text>
            <Text style={s.cardDesc}>Enter the IP address or domain of your Blockme server.</Text>
            <TextInput
              style={s.input}
              value={serverUrl}
              onChangeText={setServerUrlLocal}
              placeholder="http://192.168.1.100:3000"
              placeholderTextColor="#4b5563"
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity style={s.btn} onPress={handleServerConnect} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Connect</Text>}
            </TouchableOpacity>
            <Text style={s.hint}>The server must be running and accessible from your device. See README for setup.</Text>
          </View>
        )}

        {step === 'login' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Log in</Text>
            <Text style={s.cardDesc}>Enter your Blockme admin password.</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#4b5563"
              secureTextEntry
            />
            <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Log In</Text>}
            </TouchableOpacity>
            <Text style={s.hint}>Default password: blockme (change in Settings after first login)</Text>
          </View>
        )}

        {step === 'setup' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Set up VPN</Text>
            <Text style={s.cardDesc}>
              Blockme will create a VPN connection that routes all your traffic through your server, blocking social media everywhere — including 4G/5G.
            </Text>
            <View style={s.featureList}>
              {['Blocks all apps (not just browser)', 'Works on any network (4G, 5G, WiFi)', 'Encrypted WireGuard tunnel', 'One tap to connect'].map(f => (
                <Text key={f} style={s.feature}>✓  {f}</Text>
              ))}
            </View>
            <TouchableOpacity style={s.btn} onPress={handleSetup} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Set Up & Connect VPN</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={skipVpnSetup}>
              <Text style={s.skip}>Skip — I'll set up VPN manually</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a0a'},
  scroll: {flexGrow: 1, justifyContent: 'center', padding: 24},
  logo: {fontSize: 40, fontWeight: '800', color: '#ef4444', textAlign: 'center', marginBottom: 8},
  tagline: {fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 40},
  card: {backgroundColor: '#111111', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#1f2937'},
  cardTitle: {fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8},
  cardDesc: {fontSize: 14, color: '#9ca3af', marginBottom: 20, lineHeight: 20},
  input: {backgroundColor: '#1f2937', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16, marginBottom: 16},
  btn: {backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12},
  btnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  hint: {fontSize: 12, color: '#4b5563', textAlign: 'center', lineHeight: 18},
  featureList: {backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 20},
  feature: {color: '#86efac', fontSize: 14, marginBottom: 8},
  skip: {color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 8},
});

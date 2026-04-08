import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const C = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  primary: '#3b82f6',
  text: '#f8fafc',
  muted: '#94a3b8',
  danger: '#ef4444',
};

export default function LoginScreen() {
  const { login } = useAuth();
  const [serverUrl, setServerUrl] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    const url = serverUrl.trim().replace(/\/$/, '');
    if (!url || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your server URL and password.');
      return;
    }
    setLoading(true);
    try {
      await login(url, password);
    } catch (e: any) {
      const msg =
        e?.response?.status === 401
          ? 'Incorrect password.'
          : e?.response?.status === 429
          ? 'Too many attempts. Try again in 15 minutes.'
          : e?.code === 'ECONNABORTED' || e?.code === 'ERR_NETWORK'
          ? 'Cannot reach server. Check the URL and your network.'
          : e?.message ?? 'Login failed. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={48} color={C.primary} />
          </View>
          <Text style={styles.title}>Blockme</Text>
          <Text style={styles.tagline}>No-Turn-Back Social Media Blocker</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connect to Your Server</Text>

          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://your-server.com:3000"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="next"
            editable={!loading}
          />

          <Text style={styles.label}>Admin Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="Your admin password"
              placeholderTextColor={C.muted}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={C.muted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.btnText}>Connect & Login</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Self-host your Blockme server on a Linux VPS or home server.{'\n'}
          The app manages your VPN-based social media blocker remotely.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 36 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -1 },
  tagline: { fontSize: 13, color: C.muted, marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    color: C.text,
    fontSize: 16,
    marginBottom: 18,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  btn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: {
    color: C.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

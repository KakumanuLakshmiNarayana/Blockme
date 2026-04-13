import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '../store/useStore';
import {login} from '../services/api';

export default function LoginScreen() {
  const {setToken} = useStore();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await login(password);
      setToken(res.data.token);
    } catch {
      Alert.alert('Invalid Password', 'Check your password and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.inner}>
        <Text style={s.logo}>Blockme</Text>
        <Text style={s.sub}>Enter your admin password</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#4b5563"
          secureTextEntry
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Log In</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a0a'},
  inner: {flex: 1, justifyContent: 'center', padding: 32},
  logo: {fontSize: 40, fontWeight: '800', color: '#ef4444', textAlign: 'center', marginBottom: 8},
  sub: {fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 40},
  input: {backgroundColor: '#1f2937', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16, marginBottom: 16},
  btn: {backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 16, alignItems: 'center'},
  btnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});

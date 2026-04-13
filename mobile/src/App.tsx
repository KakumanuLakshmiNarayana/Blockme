import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import {useStore} from './store/useStore';
import {configureApiToken, resetApi} from './services/api';
import {onVpnStatusChange} from './services/vpn';

export default function App() {
  const {token, serverUrl, setVpnStatus} = useStore();

  useEffect(() => {
    // Restore auth + server config on mount
    if (serverUrl) resetApi(serverUrl);
    if (token) configureApiToken(token);

    // Listen for VPN status changes from native module
    const unsub = onVpnStatusChange(setVpnStatus);
    return unsub;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#ef4444',
            background: '#0a0a0a',
            card: '#111111',
            text: '#ffffff',
            border: '#1f2937',
            notification: '#ef4444',
          },
        }}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

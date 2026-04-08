import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import UnlockScreen from '../screens/UnlockScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import BlocklistScreen from '../screens/BlocklistScreen';
import DevicesScreen from '../screens/DevicesScreen';
import SchedulesScreen from '../screens/SchedulesScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Unlock: undefined;
  Emergency: undefined;
  Schedules: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Blocklist: undefined;
  Devices: undefined;
  Settings: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const COLORS = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  primary: '#3b82f6',
  text: '#f8fafc',
  muted: '#64748b',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Dashboard: ['shield-checkmark', 'shield-checkmark-outline'],
            Blocklist: ['ban', 'ban-outline'],
            Devices: ['phone-portrait', 'phone-portrait-outline'],
            Settings: ['settings', 'settings-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <Ionicons
              name={(focused ? active : inactive) as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Blocklist" component={BlocklistScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: COLORS.primary,
          background: COLORS.bg,
          card: COLORS.card,
          text: COLORS.text,
          border: COLORS.border,
          notification: COLORS.primary,
        },
      }}
    >
      <RootStack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      >
        {isAuthenticated ? (
          <>
            <RootStack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <RootStack.Screen
              name="Unlock"
              component={UnlockScreen}
              options={{
                title: 'Unlock Platform',
                presentation: 'modal',
                headerStyle: { backgroundColor: '#1e293b' },
              }}
            />
            <RootStack.Screen
              name="Emergency"
              component={EmergencyScreen}
              options={{
                title: 'Emergency Access',
                presentation: 'modal',
                headerStyle: { backgroundColor: '#1e293b' },
              }}
            />
            <RootStack.Screen
              name="Schedules"
              component={SchedulesScreen}
              options={{ title: 'Schedules' }}
            />
          </>
        ) : (
          <RootStack.Screen
            name="Auth"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

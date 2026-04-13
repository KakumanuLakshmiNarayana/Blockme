import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useStore} from '../store/useStore';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import UnlockScreen from '../screens/UnlockScreen';
import EmergencyScreen from '../screens/EmergencyScreen';
import BlocklistScreen from '../screens/BlocklistScreen';
import SchedulesScreen from '../screens/SchedulesScreen';
import DevicesScreen from '../screens/DevicesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StatsScreen from '../screens/StatsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {backgroundColor: '#111111', borderTopColor: '#1f2937'},
        tabBarActiveTintColor: '#ef4444',
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: {backgroundColor: '#111111'},
        headerTintColor: '#ffffff',
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{tabBarLabel: 'Home', tabBarIcon: ({color}) => <TabIcon icon="🛡" color={color} />}}
      />
      <Tab.Screen
        name="Blocklist"
        component={BlocklistScreen}
        options={{tabBarLabel: 'Block', tabBarIcon: ({color}) => <TabIcon icon="🚫" color={color} />}}
      />
      <Tab.Screen
        name="Schedules"
        component={SchedulesScreen}
        options={{tabBarLabel: 'Schedule', tabBarIcon: ({color}) => <TabIcon icon="🕐" color={color} />}}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{tabBarLabel: 'Stats', tabBarIcon: ({color}) => <TabIcon icon="📊" color={color} />}}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{tabBarLabel: 'Settings', tabBarIcon: ({color}) => <TabIcon icon="⚙" color={color} />}}
      />
    </Tab.Navigator>
  );
}

import {Text} from 'react-native';
function TabIcon({icon, color}: {icon: string; color: string}) {
  return <Text style={{fontSize: 20, color}}>{icon}</Text>;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: undefined;
  Unlock: undefined;
  Emergency: undefined;
  Devices: undefined;
};

export default function RootNavigator() {
  const {isOnboarded, token} = useStore();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#111111'},
        headerTintColor: '#ffffff',
        contentStyle: {backgroundColor: '#0a0a0a'},
      }}>
      {!isOnboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{headerShown: false}} />
      ) : !token ? (
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{headerShown: false}} />
          <Stack.Screen name="Unlock" component={UnlockScreen} options={{title: 'Unlock Request', presentation: 'modal'}} />
          <Stack.Screen name="Emergency" component={EmergencyScreen} options={{title: 'Emergency Access', presentation: 'modal'}} />
          <Stack.Screen name="Devices" component={DevicesScreen} options={{title: 'Devices'}} />
        </>
      )}
    </Stack.Navigator>
  );
}

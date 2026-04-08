import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Status = 'active' | 'degraded' | 'broken';

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

const CONFIG: Record<Status, { color: string; bg: string; icon: string; label: string }> = {
  active: { color: '#22c55e', bg: '#14532d33', icon: 'shield-checkmark', label: 'Protected' },
  degraded: { color: '#f59e0b', bg: '#78350f33', icon: 'warning', label: 'Degraded' },
  broken: { color: '#ef4444', bg: '#7f1d1d33', icon: 'alert-circle', label: 'Broken' },
};

export default function StatusBadge({ status, size = 'md' }: Props) {
  const { color, bg, icon, label } = CONFIG[status] ?? CONFIG.active;
  const small = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bg }, small && styles.badgeSm]}>
      <Ionicons name={icon as any} size={small ? 12 : 16} color={color} />
      <Text style={[styles.label, { color }, small && styles.labelSm]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  labelSm: {
    fontSize: 11,
  },
});

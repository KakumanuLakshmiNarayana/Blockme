import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  totalSeconds: number;
  onComplete?: () => void;
  color?: string;
  size?: 'sm' | 'lg';
}

export default function CountdownTimer({
  totalSeconds,
  onComplete,
  color = '#3b82f6',
  size = 'lg',
}: Props) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onComplete]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const large = size === 'lg';

  return (
    <View style={styles.container}>
      <Text style={[styles.time, { color }, large ? styles.timeLg : styles.timeSm]}>
        {display}
      </Text>
      {large && (
        <Text style={styles.label}>
          {remaining > 0 ? 'remaining' : 'ready'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  time: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  timeLg: { fontSize: 56, letterSpacing: -2 },
  timeSm: { fontSize: 20 },
  label: { color: '#64748b', fontSize: 13, marginTop: 4, fontWeight: '500' },
});

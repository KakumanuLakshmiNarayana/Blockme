import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DailyStat } from '../api/client';

interface Props {
  data: DailyStat[];
  color?: string;
}

export default function MiniBarChart({ data, color = '#3b82f6' }: Props) {
  if (!data.length) return null;

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={styles.container}>
      {data.map((item) => {
        const heightPct = (item.count / max) * 100;
        const day = new Date(item.date + 'T00:00:00').toLocaleDateString('en', {
          weekday: 'short',
        });
        return (
          <View key={item.date} style={styles.col}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(heightPct, 4)}%`,
                    backgroundColor: heightPct > 0 ? color : '#334155',
                  },
                ]}
              />
            </View>
            <Text style={styles.dayLabel}>{day}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 80,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 3,
  },
  dayLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
});

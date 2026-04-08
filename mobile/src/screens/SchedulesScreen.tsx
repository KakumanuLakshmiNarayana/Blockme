import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getSchedules,
  getSession,
  createSchedule,
  deleteSchedule,
  updateSchedule,
  type Schedule,
} from '../api/client';
import { usePolling } from '../hooks/usePolling';

const C = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  text: '#f8fafc',
  muted: '#94a3b8',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function maskToDays(mask: number): number[] {
  return DAYS.map((_, i) => i).filter((i) => (mask >> i) & 1);
}

function daysToMask(days: number[]): number {
  return days.reduce((mask, d) => mask | (1 << d), 0);
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

interface NewScheduleForm {
  name: string;
  days: number[];
  startTime: string;
  endTime: string;
}

export default function SchedulesScreen() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [sessionLocked, setSessionLocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewScheduleForm>({
    name: '',
    days: [1, 2, 3, 4, 5], // Mon-Fri default
    startTime: '09:00',
    endTime: '17:00',
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [list, session] = await Promise.all([getSchedules(), getSession()]);
      setSchedules(list);
      setSessionLocked(
        !!session.session && session.session.locked === 1 && session.session.state !== 'ended'
      );
    } catch {
      /* ignore */
    }
  }, []);

  usePolling(fetchData, 30_000);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      Alert.alert('Name Required', 'Enter a name for this schedule.');
      return;
    }
    if (form.days.length === 0) {
      Alert.alert('Days Required', 'Select at least one day.');
      return;
    }
    if (form.startTime >= form.endTime) {
      Alert.alert('Invalid Times', 'End time must be after start time.');
      return;
    }
    setSaving(true);
    try {
      await createSchedule({
        name: form.name.trim(),
        days_mask: daysToMask(form.days),
        start_time: form.startTime,
        end_time: form.endTime,
      });
      setShowModal(false);
      setForm({ name: '', days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' });
      await fetchData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error ?? 'Could not create schedule.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleSchedule(schedule: Schedule) {
    if (sessionLocked) {
      Alert.alert('Session Active', 'Cannot edit schedules during an active blocking session.');
      return;
    }
    try {
      await updateSchedule(schedule.id, { enabled: schedule.enabled === 1 ? 0 : 1 });
      await fetchData();
    } catch {
      Alert.alert('Error', 'Failed to update schedule.');
    }
  }

  async function handleDelete(schedule: Schedule) {
    if (sessionLocked) {
      Alert.alert('Session Active', 'Cannot delete schedules during an active blocking session.');
      return;
    }
    Alert.alert('Delete Schedule', `Delete "${schedule.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSchedule(schedule.id);
            await fetchData();
          } catch {
            Alert.alert('Error', 'Failed to delete schedule.');
          }
        },
      },
    ]);
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      >
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Schedules</Text>
          {sessionLocked ? (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={12} color={C.warning} />
              <Text style={styles.lockBadgeText}>Locked</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>New</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.subtitle}>
          Schedules automatically enforce blocking during set times. They cannot be edited while a
          session is active.
        </Text>

        {schedules.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={C.muted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Schedules</Text>
            <Text style={styles.emptyText}>
              Add a schedule to automatically enforce blocking during specific times.
            </Text>
          </View>
        ) : (
          schedules.map((schedule) => (
            <View key={schedule.id} style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scheduleName, schedule.enabled === 0 && styles.textDisabled]}>
                    {schedule.name}
                  </Text>
                  <Text style={styles.scheduleTime}>
                    {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}
                  </Text>
                </View>
                <Switch
                  value={schedule.enabled === 1}
                  onValueChange={() => handleToggleSchedule(schedule)}
                  disabled={sessionLocked}
                  trackColor={{ false: C.border, true: '#1d4ed8' }}
                  thumbColor={schedule.enabled === 1 ? C.primary : C.muted}
                />
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(schedule)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef444466" />
                </TouchableOpacity>
              </View>

              <View style={styles.daysRow}>
                {DAYS.map((day, i) => {
                  const active = (schedule.days_mask >> i) & 1;
                  return (
                    <View
                      key={day}
                      style={[styles.dayPill, active ? styles.dayPillActive : styles.dayPillInactive]}
                    >
                      <Text
                        style={[
                          styles.dayPillText,
                          active ? styles.dayPillTextActive : styles.dayPillTextInactive,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Schedule Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Schedule</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="e.g. Work Hours, Morning Focus"
              placeholderTextColor={C.muted}
            />

            <Text style={styles.fieldLabel}>Days</Text>
            <View style={styles.dayPicker}>
              {DAYS.map((day, i) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayPickerPill,
                    form.days.includes(i) && styles.dayPickerPillActive,
                  ]}
                  onPress={() => toggleDay(i)}
                >
                  <Text
                    style={[
                      styles.dayPickerText,
                      form.days.includes(i) && styles.dayPickerTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Start Time (24h, HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={form.startTime}
              onChangeText={(v) => setForm((f) => ({ ...f, startTime: v }))}
              placeholder="09:00"
              placeholderTextColor={C.muted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.fieldLabel}>End Time (24h, HH:MM)</Text>
            <TextInput
              style={styles.input}
              value={form.endTime}
              onChangeText={(v) => setForm((f) => ({ ...f, endTime: v }))}
              placeholder="17:00"
              placeholderTextColor={C.muted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <TouchableOpacity
              style={[styles.createBtn, saving && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Create Schedule</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  screenTitle: { fontSize: 24, fontWeight: '800', color: C.text, flex: 1 },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#78350f33',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#78350f',
  },
  lockBadgeText: { color: C.warning, fontSize: 11, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  subtitle: { color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 16 },
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 8 },
  emptyText: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  scheduleCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  scheduleName: { fontSize: 15, fontWeight: '600', color: C.text },
  textDisabled: { color: C.muted },
  scheduleTime: { fontSize: 12, color: C.muted, marginTop: 2 },
  deleteBtn: { padding: 6 },
  daysRow: { flexDirection: 'row', gap: 4 },
  dayPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayPillActive: { backgroundColor: '#1d4ed8' },
  dayPillInactive: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: C.border },
  dayPillText: { fontSize: 11, fontWeight: '700' },
  dayPillTextActive: { color: '#fff' },
  dayPillTextInactive: { color: C.muted },
  modal: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 28,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: C.text },
  modalContent: { padding: 20 },
  fieldLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 14,
    color: C.text,
    fontSize: 15,
    marginBottom: 20,
  },
  dayPicker: { flexDirection: 'row', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  dayPickerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  dayPickerPillActive: { backgroundColor: '#1d4ed8', borderColor: C.primary },
  dayPickerText: { fontSize: 13, fontWeight: '600', color: C.muted },
  dayPickerTextActive: { color: '#fff' },
  createBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

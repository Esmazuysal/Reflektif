import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme/colors';
import { useEmergency } from '../context/EmergencyContext';

export function AlarmBanner() {
  const { alarms, acknowledge } = useEmergency();
  if (alarms.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {alarms.slice(0, 3).map((a) => (
        <View
          key={a.id}
          style={[
            styles.card,
            a.type === 'safe_zone_exit' ? styles.zone : styles.health,
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{a.title}</Text>
            <Text style={styles.msg}>{a.message}</Text>
          </View>
          <Pressable onPress={() => acknowledge(a.id)} style={styles.ack}>
            <Text style={styles.ackText}>Tamam</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  health: {
    backgroundColor: 'rgba(212, 101, 92, 0.18)',
    borderColor: 'rgba(212, 101, 92, 0.45)',
  },
  zone: {
    backgroundColor: 'rgba(212, 160, 74, 0.18)',
    borderColor: 'rgba(212, 160, 74, 0.45)',
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  msg: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.mistMuted,
    lineHeight: 18,
  },
  ack: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
  },
  ackText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.text,
  },
});

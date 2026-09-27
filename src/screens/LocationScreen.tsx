import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';
import { Panel, PrimaryButton, SectionTitle } from '../components/ui';
import { SafeZoneMap } from '../components/SafeZoneMap';
import { AlarmBanner } from '../components/AlarmBanner';
import { useData } from '../context/DataContext';
import { useEmergency } from '../context/EmergencyContext';

export function LocationScreen() {
  const { patient, refresh } = useData();
  const { simulateSafeZoneExit } = useEmergency();
  const zone = patient?.safeZone;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#14181F', '#1A222C']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle
            title="Güvenli alan"
            subtitle="Alan dışına çıkışta acil kişilere uyarı tetiklenir"
          />

          <AlarmBanner />

          {!patient ? (
            <Panel>
              <Text style={styles.hint}>Önce hasta kaydı oluşturun.</Text>
            </Panel>
          ) : (
            <>
              <SafeZoneMap
                inSafeZone={zone?.inSafeZone ?? true}
                name={zone?.name ?? 'Ev Güvenli Alanı'}
                radiusMeters={zone?.radiusMeters ?? 400}
                address={zone?.lastAddress || 'Konum henüz güncellenmedi'}
              />

              <Panel style={{ marginTop: spacing.md }}>
                <Text style={styles.rowLabel}>Son konum</Text>
                <Text style={styles.rowValue}>
                  {zone?.lastAddress || '—'}
                </Text>
                {zone?.lastLat != null ? (
                  <Text style={styles.coords}>
                    {zone.lastLat.toFixed(4)}, {zone.lastLng?.toFixed(4)}
                  </Text>
                ) : null}
              </Panel>

              <Panel style={{ marginTop: spacing.sm }}>
                <Text style={styles.rowLabel}>Alan</Text>
                <Text style={styles.rowValue}>{zone?.name}</Text>
                <Text style={styles.hint}>
                  Yarıçap {zone?.radiusMeters ?? 400} m. Çıkışta alarm + yerel
                  bildirim + yakına bildirim kaydı oluşur.
                </Text>
              </Panel>

              <PrimaryButton
                label="Alan dışı alarmını test et"
                onPress={async () => {
                  await simulateSafeZoneExit();
                  await refresh();
                }}
                style={{ marginTop: spacing.md }}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
  },
  rowLabel: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  rowValue: {
    marginTop: 4,
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 20,
    color: colors.text,
  },
  coords: {
    marginTop: 4,
    fontFamily: 'Lexend_400Regular',
    fontSize: 13,
    color: colors.accent,
  },
  hint: {
    marginTop: 8,
    fontFamily: 'Lexend_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});

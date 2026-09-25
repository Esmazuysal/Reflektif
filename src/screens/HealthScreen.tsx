import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';
import { Chip, Metric, Panel, PrimaryButton, SectionTitle } from '../components/ui';
import { Sparkline } from '../components/Sparkline';
import { useData } from '../context/DataContext';

export function HealthScreen() {
  const { patient, health, seedDemoHealth } = useData();
  const hr = health.heartRate;

  if (!patient) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0F2A2A', '#1A3330']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.content}>
            <SectionTitle
              title="Nabız ve sağlık"
              subtitle="Önce Ana veya Profil sekmesinden hasta kaydı oluşturun"
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0F2A2A', '#1A3330']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle
            title="Nabız ve sağlık"
            subtitle="SQLite veritabanındaki son kayıt (saat entegrasyonu sonra)"
          />

          <View style={styles.chipRow}>
            <Chip label={health.deviceName} active />
            <Chip label={`Kaynak: ${health.source}`} />
            <Chip label={`Batarya %${health.batteryPercent}`} />
          </View>

          <Panel style={{ marginTop: spacing.md }}>
            <Text style={styles.bigLabel}>Anlık nabız</Text>
            <View style={styles.bigRow}>
              <Text style={styles.bigValue}>{hr.current || '—'}</Text>
              <Text style={styles.bigUnit}>bpm</Text>
            </View>
            <Text style={styles.status}>
              Durum:{' '}
              {hr.status === 'normal'
                ? 'Normal aralıkta'
                : hr.status === 'high'
                  ? 'Yüksek'
                  : hr.status === 'low'
                    ? 'Düşük'
                    : hr.status}
            </Text>
            {hr.samples.length > 0 ? (
              <>
                <View style={{ marginTop: spacing.md }}>
                  <Sparkline samples={hr.samples.map((s) => s.bpm)} height={72} />
                </View>
                <View style={styles.sampleRow}>
                  {hr.samples.map((s) => (
                    <Text key={s.recordedAt} style={styles.sampleTime}>
                      {s.recordedAt}
                    </Text>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.empty}>
                Henüz veri yok. Arkadaşın saat bağlantısını ekleyene kadar örnek
                kayıt basabilirsiniz.
              </Text>
            )}
          </Panel>

          <PrimaryButton
            label="Örnek saat verisi kaydet (demo)"
            onPress={seedDemoHealth}
            style={{ marginTop: spacing.md }}
          />

          <View style={styles.grid}>
            <Panel style={styles.gridItem}>
              <Metric label="Dinlenme" value={`${hr.resting || '—'}`} unit="bpm" />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="Gün min–max"
                value={hr.min ? `${hr.min}–${hr.max}` : '—'}
                tone="warn"
              />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="SpO₂"
                value={`${health.spo2.percent || '—'}`}
                unit="%"
                tone="good"
              />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="Stres"
                value={`${health.stress.level || '—'}`}
                unit={health.stress.label}
              />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="Adım"
                value={`${health.steps.today}`}
                unit={`/ ${health.steps.goal}`}
              />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="Kalori"
                value={`${health.calories}`}
                unit="kcal"
              />
            </Panel>
          </View>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bigLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  bigValue: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 56,
    color: colors.heart,
    letterSpacing: -2,
  },
  bigUnit: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 18,
    color: colors.textMuted,
  },
  status: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.success,
  },
  sampleRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sampleTime: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 10,
    color: colors.textMuted,
  },
  empty: {
    marginTop: spacing.md,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  grid: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridItem: { width: '48%', flexGrow: 1 },
});

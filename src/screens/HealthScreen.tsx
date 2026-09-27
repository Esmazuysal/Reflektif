import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/colors';
import { Chip, Metric, Panel, PrimaryButton, SectionTitle } from '../components/ui';
import { Sparkline } from '../components/Sparkline';
import { useData } from '../context/DataContext';
import { useEmergency } from '../context/EmergencyContext';
import { AlarmBanner } from '../components/AlarmBanner';

export function HealthScreen() {
  const {
    patient,
    health,
    syncXiaomiWatch,
    healthKitAvailable,
    healthKitConnected,
    initHealthKit,
    refresh,
  } = useData();
  const { simulateCriticalHeart } = useEmergency();
  const [syncing, setSyncing] = useState(false);
  const hr = health.heartRate;

  // Veri kaynağını kontrol et
  const source = (health as any).source || 'mock';
  const isRealData = source === 'apple_healthkit' || source === 'xiaomi_cloud_sync' || source === 'mi_fitness_export' || source === 'xiaomi_watch_s4';

  // HealthKit bağlıysa otomatik senkronizasyon (her 10 saniyede bir)
  useEffect(() => {
    if (!patient?.id || !healthKitConnected) return;

    // İlk yüklemede hemen çalıştır
    refresh();

    const interval = setInterval(() => {
      refresh();
    }, 10000);

    return () => clearInterval(interval);
  }, [patient?.id, healthKitConnected, refresh]);

  // HealthKit değilse backend polling (her 3 saniyede bir)
  useEffect(() => {
    if (!patient?.id || healthKitConnected) return;

    const interval = setInterval(() => {
      syncXiaomiWatch();
    }, 3000);

    return () => clearInterval(interval);
  }, [patient?.id, healthKitConnected, syncXiaomiWatch]);

  const handleSyncWatch = async () => {
    setSyncing(true);
    try {
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectHealthKit = async () => {
    setSyncing(true);
    try {
      const ok = await initHealthKit();
      if (ok) {
        Alert.alert('✅ Başarılı', 'Apple Health bağlantısı kuruldu! Saat verileriniz okunuyor.');
        await refresh();
      } else {
        Alert.alert(
          'Apple Health İzni',
          'Sağlık izni penceresi açılmadıysa veya izin verilmediyse:\n\niPhone Ayarlar ➔ Sağlık ➔ Veri Erişimi ve Cihazlar ➔ Reflektif bölümünden tüm okuma izinlerini açın.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Hata', err?.message || 'İzin alınamadı.');
    } finally {
      setSyncing(false);
    }
  };

  // Veri kaynağı etiketi
  const getSourceLabel = () => {
    if (source === 'apple_healthkit') return 'Apple Health';
    if (source === 'xiaomi_cloud_sync') return 'Xiaomi Cloud';
    if (source === 'mi_fitness_export') return 'Mi Fitness';
    if (source === 'xiaomi_watch_s4') return 'Watch S4';
    return 'Beklemede';
  };

  if (!patient) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#14181F', '#1A222C']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.content}>
            <SectionTitle
              title="Nabız ve Sağlık Takibi"
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
        colors={['#14181F', '#1A222C']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle
            title="Sağlık takibi"
            subtitle={healthKitConnected
              ? 'Apple Health üzerinden saat verileri'
              : 'Nabız ve SpO₂ — kritik eşikte alarm tetiklenir'
            }
          />

          <AlarmBanner />

          {/* Bağlantı */}
          <Panel style={{ marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Lexend_600SemiBold', fontSize: 18, color: colors.mist }}>
                  {healthKitConnected ? 'Apple Health bağlı' : 'Saat bağlantısı'}
                </Text>
              </View>
              <Chip
                label={healthKitConnected ? 'Bağlı' : isRealData ? 'Backend' : 'Beklemede'}
                active={healthKitConnected || isRealData}
              />
            </View>

            <View style={styles.chipRow}>
              <Chip label={`Kaynak: ${getSourceLabel()}`} />
              <Chip label={`Güncelleme: ${health.lastSyncAt ? new Date(health.lastSyncAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--'}`} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              {Platform.OS === 'ios' && !healthKitConnected && (
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={syncing ? 'Bağlanıyor...' : 'Apple Health bağla'}
                    onPress={handleConnectHealthKit}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label={syncing ? 'Güncelleniyor...' : 'Şimdi güncelle'}
                  onPress={handleSyncWatch}
                />
              </View>
            </View>
            <PrimaryButton
              label="Kritik nabız alarmını test et"
              onPress={async () => {
                await simulateCriticalHeart();
                await refresh();
              }}
              style={{ marginTop: spacing.sm, backgroundColor: colors.danger }}
            />
          </Panel>

          {/* Anlık Nabız */}
          <Panel style={{ marginTop: spacing.xs }}>
            <Text style={styles.bigLabel}>Anlık Nabız (Kalp Ritmi)</Text>
            <View style={styles.bigRow}>
              <Text style={styles.bigValue}>{hr.current || '—'}</Text>
              <Text style={styles.bigUnit}>bpm</Text>
            </View>
            <Text style={[styles.status, {
              color: hr.status === 'normal' ? colors.success :
                     hr.status === 'high' ? '#FF6B6B' : '#FFB347'
            }]}>
              Durum:{' '}
              {hr.status === 'normal'
                ? 'Normal aralıkta (Stabil)'
                : hr.status === 'high'
                  ? '⚠️ Yüksek Nabız Uyarısı!'
                  : hr.status === 'low'
                    ? '⚠️ Düşük Nabız Uyarısı!'
                    : hr.status}
            </Text>
            {hr.samples.length > 0 ? (
              <>
                <View style={{ marginTop: spacing.md }}>
                  <Sparkline samples={hr.samples.map((s) => s.bpm)} height={72} />
                </View>
                <View style={styles.sampleRow}>
                  {hr.samples.map((s, idx) => (
                    <Text key={idx} style={styles.sampleTime}>
                      {s.recordedAt}: {s.bpm}bpm
                    </Text>
                  ))}
                </View>
              </>
            ) : null}
          </Panel>

          {/* Metrik Grid */}
          <View style={styles.grid}>
            <Panel style={styles.gridItem}>
              <Metric label="Dinlenme Nabız" value={`${hr.resting || '—'}`} unit="bpm" />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="Gün Min–Max"
                value={hr.min ? `${hr.min}–${hr.max}` : '—'}
                tone="warn"
              />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="Kan Oksijeni (SpO₂)"
                value={`${health.spo2.percent || '—'}`}
                unit="%"
                tone="good"
              />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="Stres Seviyesi"
                value={`${health.stress.level || '—'}`}
                unit={health.stress.label}
              />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="Günlük Adım"
                value={`${health.steps.today}`}
                unit={`/ ${health.steps.goal}`}
              />
            </Panel>
            <Panel style={styles.gridItem}>
              <Metric
                label="Harcanan Kalori"
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  bigLabel: {
    fontFamily: 'Lexend_400Regular',
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
    fontFamily: 'Lexend_700Bold',
    fontSize: 56,
    color: colors.heart,
    letterSpacing: -2,
  },
  bigUnit: {
    fontFamily: 'Lexend_500Medium',
    fontSize: 18,
    color: colors.textMuted,
  },
  status: {
    marginTop: 4,
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: colors.success,
  },
  sampleRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  sampleTime: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 10,
    color: colors.textMuted,
  },
  empty: {
    marginTop: spacing.md,
    fontFamily: 'Lexend_400Regular',
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

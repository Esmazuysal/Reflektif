import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/colors';
import { Chip, Metric, Panel, PrimaryButton, SectionTitle } from '../components/ui';
import { Sparkline } from '../components/Sparkline';
import { useData } from '../context/DataContext';

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
    if (source === 'apple_healthkit') return '🍎 Apple Health (Gerçek Veri)';
    if (source === 'xiaomi_cloud_sync') return '☁️ Xiaomi Cloud';
    if (source === 'mi_fitness_export') return '📱 Mi Fitness Export';
    if (source === 'xiaomi_watch_s4') return '⌚ Xiaomi Watch S4';
    return '⚠️ Veri bekleniyor...';
  };

  if (!patient) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0F2A2A', '#1A3330']} style={StyleSheet.absoluteFill} />
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
        colors={['#0F2A2A', '#1A3330']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle
            title="Xiaomi Watch S4 Sağlık Takibi"
            subtitle={healthKitConnected
              ? 'Apple Health üzerinden gerçek saat verileri okunuyor'
              : 'Saat verilerinizi görmek için Apple Health bağlantısını kurun'
            }
          />

          {/* Bağlantı Durum Kartı */}
          <Panel style={{ marginBottom: spacing.md, backgroundColor: healthKitConnected ? '#0A3D2F' : isRealData ? '#0A3D2F' : '#3D2A0A' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Fraunces_600SemiBold', fontSize: 18, color: colors.mist }}>
                  {healthKitConnected ? '🍎 Apple Health Bağlı' : '📱 Saat Veri Kaynağı'}
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.mistMuted, marginTop: 2 }}>
                  {healthKitConnected
                    ? 'Xiaomi Watch S4 → Mi Fitness → Apple Health → Reflektif'
                    : 'Bağlantı bekleniyor...'}
                </Text>
              </View>
              <Chip
                label={healthKitConnected ? '🟢 Bağlı' : isRealData ? '🟡 Backend' : '⚪ Beklemede'}
                active={healthKitConnected || isRealData}
              />
            </View>

            <View style={styles.chipRow}>
              <Chip label={`Kaynak: ${getSourceLabel()}`} />
              <Chip label={`Güncelleme: ${health.lastSyncAt ? new Date(health.lastSyncAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--'}`} />
            </View>

            {/* Veri Akışı Bilgilendirme */}
            <View style={{ marginTop: spacing.sm, padding: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.mist }}>
                {healthKitConnected ? '✅ Gerçek Veri Akışı Aktif:' : '📋 Veri Akışı Kurulumu:'}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.mistMuted, marginTop: 4, lineHeight: 18 }}>
                {healthKitConnected
                  ? `1. Xiaomi Watch S4 nabzınızı ölçüyor\n2. Mi Fitness uygulaması Apple Health'e aktarıyor\n3. Reflektif her 10 saniyede Apple Health'ten okuyor\n4. Tüm veriler otomatik güncelleniyor ✨`
                  : Platform.OS === 'ios'
                    ? `1. Aşağıdaki "Apple Health Bağla" butonuna basın\n2. HealthKit izin ekranında tüm verilere izin verin\n3. Mi Fitness'ta Apple Health senkronizasyonunun açık olduğundan emin olun`
                    : `iOS cihazda çalıştırmanız gerekiyor.\nApple Health entegrasyonu yalnızca iPhone'da çalışır.`
                }
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              {Platform.OS === 'ios' && !healthKitConnected && (
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label={syncing ? 'Bağlanıyor...' : '🍎 Apple Health Bağla'}
                    onPress={handleConnectHealthKit}
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label={syncing ? 'Güncelleniyor...' : '🔄 Şimdi Güncelle'}
                  onPress={handleSyncWatch}
                />
              </View>
            </View>
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
            ) : (
              <Text style={styles.empty}>
                {healthKitConnected
                  ? 'Apple Health\'te henüz bugün için nabız verisi yok. Saatinizin Mi Fitness ile senkronize olduğundan emin olun.'
                  : 'Henüz saat verisi aktarılmadı. Apple Health bağlantısını kurun veya Mi Fitness\'ı senkronize edin.'}
              </Text>
            )}
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
    flexWrap: 'wrap',
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

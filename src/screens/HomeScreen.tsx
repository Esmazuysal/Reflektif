import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/colors';
import { Chip, Metric, Panel, PrimaryButton, SectionTitle } from '../components/ui';
import { Sparkline } from '../components/Sparkline';
import { AlarmBanner } from '../components/AlarmBanner';
import { useData } from '../context/DataContext';
import { useEmergency } from '../context/EmergencyContext';

export function HomeScreen({ navigation }: { navigation: any }) {
  const { patient, health, loading, error, apiOnline, refresh, createPatient } =
    useData();
  const { openCount } = useEmergency();
  const fade = useRef(new Animated.Value(0)).current;
  const [name, setName] = useState('');
  const [caregiver, setCaregiver] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fade, patient]);

  const pendingMeds =
    patient?.medications.filter((m) => m.takenToday.some((t) => !t)).length ??
    0;

  const onCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createPatient({
        fullName: name.trim(),
        caregiverName: caregiver.trim(),
        stage: '',
        notes: '',
      });
      setName('');
      setCaregiver('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#14181F', '#1A222C', '#1C2830']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fade }}>
            <Text style={styles.brand}>Reflektif</Text>
            <Text style={styles.tagline}>
              Güvenlik, sağlık takibi ve bilişsel destek
            </Text>

            <AlarmBanner />

            {!apiOnline ? (
              <Panel>
                <Text style={styles.warnTitle}>Backend kapalı</Text>
                <Text style={styles.warnBody}>
                  {error ??
                    'API çalışmıyor. Terminalde: cd api/Reflektif.Api && dotnet run'}
                </Text>
                <PrimaryButton
                  label="Yeniden dene"
                  onPress={refresh}
                  style={{ marginTop: spacing.md }}
                />
              </Panel>
            ) : loading ? (
              <ActivityIndicator color={colors.accent} />
            ) : !patient ? (
              <Panel style={styles.heroPanel}>
                <SectionTitle
                  title="Hasta kaydı oluştur"
                  subtitle="Sınıfta / pilotta bilgileri buradan girin — sabit isim yok"
                />
                <Text style={styles.fieldLabel}>Hasta adı soyadı *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn. Fatma Yılmaz"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
                <Text style={styles.fieldLabel}>Bakım veren</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Örn. Zeynep Turgut"
                  placeholderTextColor={colors.textMuted}
                  value={caregiver}
                  onChangeText={setCaregiver}
                />
                <PrimaryButton
                  label={saving ? 'Kaydediliyor…' : 'Kaydet ve başla'}
                  onPress={onCreate}
                  style={{ marginTop: spacing.md }}
                />
              </Panel>
            ) : (
              <>
                <Panel style={styles.heroPanel}>
                  <View style={styles.heroTop}>
                    <View>
                      <Text style={styles.patientLabel}>Hasta</Text>
                      <Text style={styles.patientName}>{patient.fullName}</Text>
                    </View>
                    <Chip
                      label={
                        openCount > 0
                          ? `${openCount} alarm`
                          : patient.safeZone?.inSafeZone
                            ? 'Güvende'
                            : 'Uyarı'
                      }
                      active={openCount === 0 && !!patient.safeZone?.inSafeZone}
                    />
                  </View>
                  <Text style={styles.deviceLine}>
                    {health.deviceName} · {health.model} · Batarya %
                    {health.batteryPercent}
                  </Text>
                </Panel>

                <SectionTitle
                  title="Saatten gelen özet"
                  subtitle="Veritabanındaki son sağlık kaydı"
                  style={{ marginTop: spacing.lg }}
                />

                <Panel>
                  <View style={styles.metricsRow}>
                    <Metric
                      label="Nabız"
                      value={`${health.heartRate.current || '—'}`}
                      unit="bpm"
                      tone="heart"
                    />
                    <Metric
                      label="Adım"
                      value={`${health.steps.today}`}
                      tone="good"
                    />
                    <Metric
                      label="SpO₂"
                      value={`${health.spo2.percent || '—'}`}
                      unit="%"
                    />
                  </View>
                  {health.heartRate.samples.length > 0 ? (
                    <View style={{ marginTop: spacing.md }}>
                      <Sparkline
                        samples={health.heartRate.samples.map((s) => s.bpm)}
                      />
                    </View>
                  ) : null}
                </Panel>

                <View style={styles.quickRow}>
                  <Panel
                    style={styles.quickCard}
                    onPress={() => navigation.navigate('Sağlık')}
                  >
                    <Text style={styles.quickLabel}>Uyku</Text>
                    <Text style={styles.quickValue}>
                      {health.sleep.hours || '—'} sa
                    </Text>
                    <Text style={styles.quickHint}>{health.sleep.quality}</Text>
                  </Panel>
                  <Panel
                    style={styles.quickCard}
                    onPress={() => navigation.navigate('İlaçlar')}
                  >
                    <Text style={styles.quickLabel}>İlaç</Text>
                    <Text style={styles.quickValue}>{pendingMeds}</Text>
                    <Text style={styles.quickHint}>bekleyen</Text>
                  </Panel>
                </View>

                <PrimaryButton
                  label="Konum ve güvenli alanı aç"
                  onPress={() => navigation.navigate('Konum')}
                  style={{ marginTop: spacing.md }}
                />
              </>
            )}
          </Animated.View>
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
  brand: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 36,
    color: colors.mist,
    letterSpacing: -0.8,
  },
  tagline: {
    marginTop: 6,
    marginBottom: spacing.lg,
    fontFamily: 'Lexend_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.mistMuted,
    maxWidth: 300,
  },
  heroPanel: { backgroundColor: colors.surfaceElevated },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientLabel: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  patientName: {
    marginTop: 2,
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 24,
    color: colors.text,
  },
  deviceLine: {
    marginTop: spacing.sm,
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: colors.accent,
  },
  metricsRow: { flexDirection: 'row', gap: spacing.md },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickCard: { flex: 1 },
  quickLabel: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  quickValue: {
    marginTop: 4,
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 26,
    color: colors.text,
  },
  quickHint: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 12,
    color: colors.mistMuted,
  },
  fieldLabel: {
    marginTop: spacing.sm,
    marginBottom: 6,
    fontFamily: 'Lexend_500Medium',
    fontSize: 12,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.bgSoft,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: 'Lexend_400Regular',
    fontSize: 15,
  },
  warnTitle: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 20,
    color: colors.warning,
  },
  warnBody: {
    marginTop: 8,
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.mistMuted,
  },
});

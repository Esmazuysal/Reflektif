import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';
import { Panel, PrimaryButton, SectionTitle } from '../components/ui';
import { SafeZoneMap } from '../components/SafeZoneMap';
import { useData } from '../context/DataContext';

export function LocationScreen() {
  const { patient } = useData();
  const zone = patient?.safeZone;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0F2A2A', '#143434']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle
            title="Güvenli alan"
            subtitle="Alan dışına çıkışta yakınlara anlık bildirim"
          />

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
                <Text style={styles.rowLabel}>Alan ayarı</Text>
                <Text style={styles.rowValue}>{zone?.name}</Text>
                <Text style={styles.hint}>
                  Yarıçap {zone?.radiusMeters ?? 400} m. Saat/telefon GPS
                  entegrasyonu arkadaşın tarafında API’ye yazılacak.
                </Text>
              </Panel>

              <PrimaryButton
                label="Güvenli alanı düzenle (yakında)"
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
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  rowValue: {
    marginTop: 4,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: colors.text,
  },
  coords: {
    marginTop: 4,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.accent,
  },
  hint: {
    marginTop: 8,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});

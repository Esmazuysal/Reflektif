import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/colors';
import { Panel, PrimaryButton, SectionTitle } from '../components/ui';
import { useData } from '../context/DataContext';

export function MedicationsScreen() {
  const { patient, addMedication, toggleMedicationTaken, removeMedication } =
    useData();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [times, setTimes] = useState('09:00');

  const onAdd = async () => {
    if (!patient) {
      Alert.alert('Önce hasta kaydı oluşturun');
      return;
    }
    if (!name.trim()) {
      Alert.alert('İlaç adı gerekli');
      return;
    }
    try {
      await addMedication({
        name: name.trim(),
        dose: dose.trim() || '1 doz',
        times: times.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setName('');
      setDose('');
      setTimes('09:00');
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
  };

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
          keyboardShouldPersistTaps="handled"
        >
          <SectionTitle
            title="İlaç hatırlatıcı"
            subtitle="İlaçları siz ekleyin — veritabanına yazılır"
          />

          {!patient ? (
            <Panel>
              <Text style={styles.empty}>Önce hasta kaydı oluşturun.</Text>
            </Panel>
          ) : (
            <>
              {(patient.medications ?? []).map((med) => (
                <Panel key={med.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{med.name}</Text>
                      <Text style={styles.dose}>{med.dose}</Text>
                    </View>
                    <Pressable onPress={() => removeMedication(med.id)}>
                      <Text style={styles.delete}>Sil</Text>
                    </Pressable>
                  </View>
                  <View style={styles.times}>
                    {med.times.map((time, i) => {
                      const taken = med.takenToday[i];
                      return (
                        <Pressable
                          key={`${med.id}-${time}-${i}`}
                          onPress={() => toggleMedicationTaken(med.id, i)}
                          style={[styles.timeChip, taken && styles.timeChipOn]}
                        >
                          <Text
                            style={[
                              styles.timeText,
                              taken && styles.timeTextOn,
                            ]}
                          >
                            {time} · {taken ? 'Alındı' : 'Bekliyor'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Panel>
              ))}

              <Panel style={{ marginTop: spacing.sm }}>
                <Text style={styles.addTitle}>Yeni ilaç</Text>
                <Text style={styles.label}>İlaç adı</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Donepezil"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.label}>Doz</Text>
                <TextInput
                  style={styles.input}
                  value={dose}
                  onChangeText={setDose}
                  placeholder="5 mg"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.label}>Saatler (virgülle)</Text>
                <TextInput
                  style={styles.input}
                  value={times}
                  onChangeText={setTimes}
                  placeholder="09:00,21:00"
                  placeholderTextColor={colors.textMuted}
                />
                <PrimaryButton
                  label="İlacı kaydet"
                  onPress={onAdd}
                  style={{ marginTop: spacing.md }}
                />
              </Panel>
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
  card: { marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', gap: 8 },
  name: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 22,
    color: colors.text,
  },
  dose: {
    marginTop: 2,
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: colors.accent,
  },
  delete: {
    fontFamily: 'Lexend_500Medium',
    fontSize: 13,
    color: colors.danger,
  },
  times: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipOn: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  timeText: {
    fontFamily: 'Lexend_500Medium',
    fontSize: 13,
    color: colors.mistMuted,
  },
  timeTextOn: { color: colors.bg },
  addTitle: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  label: {
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
  empty: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: colors.textMuted,
  },
});

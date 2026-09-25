import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme/colors';
import { Panel, PrimaryButton, SectionTitle } from '../components/ui';
import { useData } from '../context/DataContext';

export function ProfileScreen() {
  const {
    patient,
    createPatient,
    updatePatient,
    addContact,
    removeContact,
    refresh,
  } = useData();

  const [fullName, setFullName] = useState(patient?.fullName ?? '');
  const [birthYear, setBirthYear] = useState(
    patient?.birthYear ? String(patient.birthYear) : '',
  );
  const [stage, setStage] = useState(patient?.stage ?? '');
  const [caregiver, setCaregiver] = useState(patient?.caregiverName ?? '');
  const [notes, setNotes] = useState(patient?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const [cName, setCName] = useState('');
  const [cRelation, setCRelation] = useState('');
  const [cPhone, setCPhone] = useState('');

  React.useEffect(() => {
    setFullName(patient?.fullName ?? '');
    setBirthYear(patient?.birthYear ? String(patient.birthYear) : '');
    setStage(patient?.stage ?? '');
    setCaregiver(patient?.caregiverName ?? '');
    setNotes(patient?.notes ?? '');
  }, [patient]);

  const savePatient = async () => {
    if (!fullName.trim()) {
      Alert.alert('Eksik bilgi', 'Hasta adı zorunlu.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        birthYear: birthYear ? Number(birthYear) : null,
        stage: stage.trim(),
        caregiverName: caregiver.trim(),
        notes: notes.trim(),
      };
      if (patient) await updatePatient(payload);
      else await createPatient(payload);
    } catch (e: any) {
      Alert.alert('Hata', e.message ?? 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    if (!patient) {
      Alert.alert('Önce hasta kaydı oluşturun');
      return;
    }
    if (!cName.trim() || !cPhone.trim()) {
      Alert.alert('Eksik bilgi', 'İsim ve telefon gerekli.');
      return;
    }
    try {
      await addContact({
        name: cName.trim(),
        relation: cRelation.trim(),
        phone: cPhone.trim(),
        isPrimary: (patient.contacts?.length ?? 0) === 0,
      });
      setCName('');
      setCRelation('');
      setCPhone('');
    } catch (e: any) {
      Alert.alert('Hata', e.message ?? 'Kişi eklenemedi');
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0F2A2A', '#163636']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SectionTitle
            title="Hasta bilgileri"
            subtitle="Veritabanına kaydedilir — istediğiniz gibi düzenleyin"
          />

          <Panel>
            <Field label="Ad soyad *" value={fullName} onChange={setFullName} />
            <Field
              label="Doğum yılı"
              value={birthYear}
              onChange={setBirthYear}
              keyboard="number-pad"
            />
            <Field
              label="Hastalık dönemi"
              value={stage}
              onChange={setStage}
              placeholder="Erken / orta / ileri"
            />
            <Field
              label="Bakım veren"
              value={caregiver}
              onChange={setCaregiver}
            />
            <Field
              label="Notlar"
              value={notes}
              onChange={setNotes}
              multiline
            />
            <PrimaryButton
              label={saving ? 'Kaydediliyor…' : patient ? 'Güncelle' : 'Oluştur'}
              onPress={savePatient}
              style={{ marginTop: spacing.md }}
            />
            <PrimaryButton
              label="Yenile"
              onPress={refresh}
              style={{ marginTop: spacing.sm, backgroundColor: colors.surfaceElevated }}
            />
          </Panel>

          <SectionTitle
            title="Yakın çevre"
            subtitle="İsim ve telefon — tek dokunuşla ara"
            style={{ marginTop: spacing.lg }}
          />

          {(patient?.contacts ?? []).map((c) => (
            <Panel key={c.id} style={styles.contact}>
              <View style={styles.contactTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.relation}>{c.relation}</Text>
                </View>
                <Pressable onPress={() => removeContact(c.id)}>
                  <Text style={styles.delete}>Sil</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => Linking.openURL(`tel:${c.phone}`)}
                style={styles.callBtn}
              >
                <Text style={styles.callText}>{c.phone}</Text>
              </Pressable>
            </Panel>
          ))}

          <Panel style={{ marginTop: spacing.sm }}>
            <Text style={styles.addTitle}>Yeni kişi ekle</Text>
            <Field label="İsim" value={cName} onChange={setCName} />
            <Field label="Yakınlık" value={cRelation} onChange={setCRelation} />
            <Field label="Telefon" value={cPhone} onChange={setCPhone} keyboard="phone-pad" />
            <PrimaryButton
              label="Kişiyi kaydet"
              onPress={saveContact}
              style={{ marginTop: spacing.md }}
            />
          </Panel>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboard?: any;
}) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboard}
      />
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
  fieldLabel: {
    marginBottom: 6,
    fontFamily: 'DMSans_500Medium',
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
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
  contact: { marginBottom: spacing.sm },
  contactTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  contactName: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    color: colors.text,
  },
  relation: {
    marginTop: 2,
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  delete: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: colors.danger,
  },
  callBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.bgSoft,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  callText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: colors.mist,
  },
  addTitle: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});

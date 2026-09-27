import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';

const WORD_POOL = [
  'Elma',
  'Deniz',
  'Kitap',
  'Çiçek',
  'Kahve',
  'Güneş',
  'Ev',
  'Kedi',
  'Müzik',
  'Yağmur',
  'Ekmek',
  'Kalem',
];

type Phase = 'show' | 'pick' | 'result';

function pickRandom(n: number) {
  return [...WORD_POOL].sort(() => Math.random() - 0.5).slice(0, n);
}

export function WordMemoryGame() {
  const [targets, setTargets] = useState<string[]>(() => pickRandom(3));
  const [phase, setPhase] = useState<Phase>('show');
  const [countdown, setCountdown] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const options = useMemo(() => {
    const distractors = WORD_POOL.filter((w) => !targets.includes(w))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [...targets, ...distractors].sort(() => Math.random() - 0.5);
  }, [targets]);

  useEffect(() => {
    if (phase !== 'show') return;
    setCountdown(5);
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(tick);
          setPhase('pick');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [phase, targets]);

  const toggle = (word: string) => {
    if (phase !== 'pick') return;
    setSelected((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
    );
  };

  const check = () => {
    const correct = targets.filter((t) => selected.includes(t)).length;
    const wrong = selected.filter((s) => !targets.includes(s)).length;
    setScore(Math.max(0, correct - wrong));
    setPhase('result');
  };

  const reset = () => {
    setTargets(pickRandom(3));
    setSelected([]);
    setScore(null);
    setPhase('show');
  };

  return (
    <View>
      {phase === 'show' ? (
        <>
          <Text style={styles.hint}>
            Bu kelimeleri ezberle · {countdown} sn
          </Text>
          <View style={styles.wordWrap}>
            {targets.map((w) => (
              <View key={w} style={styles.wordChip}>
                <Text style={styles.wordText}>{w}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {phase === 'pick' ? (
        <>
          <Text style={styles.hint}>
            Az önce gördüğün 3 kelimeyi seç ({selected.length}/3)
          </Text>
          <View style={styles.wordWrap}>
            {options.map((w) => {
              const on = selected.includes(w);
              return (
                <Pressable
                  key={w}
                  onPress={() => toggle(w)}
                  style={[styles.optionChip, on && styles.optionOn]}
                >
                  <Text style={[styles.optionText, on && styles.optionTextOn]}>
                    {w}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <PrimaryButton
            label="Kontrol et"
            onPress={check}
            style={{ marginTop: spacing.md }}
          />
        </>
      ) : null}

      {phase === 'result' ? (
        <>
          <Text style={styles.result}>
            {score === 3
              ? 'Harika! Hepsi doğru.'
              : `Skor: ${score} / 3 doğru`}
          </Text>
          <Text style={styles.hint}>Doğru kelimeler: {targets.join(', ')}</Text>
          <PrimaryButton
            label="Yeniden oyna"
            onPress={reset}
            style={{ marginTop: spacing.md }}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  wordChip: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.sm,
  },
  wordText: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 20,
    color: colors.bg,
  },
  optionChip: {
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radius.sm,
    minWidth: '30%',
    alignItems: 'center',
  },
  optionOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionText: {
    fontFamily: 'Lexend_500Medium',
    fontSize: 16,
    color: colors.mist,
  },
  optionTextOn: {
    color: colors.bg,
  },
  result: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 22,
    color: colors.success,
    marginBottom: spacing.sm,
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';

const PALETTE = [
  { id: 'teal', color: '#5BA8A0', label: 'Yeşil' },
  { id: 'sand', color: '#E8C498', label: 'Bej' },
  { id: 'rose', color: '#E07A6F', label: 'Pembe' },
  { id: 'sky', color: '#7EB6D9', label: 'Mavi' },
] as const;

type Phase = 'watch' | 'play' | 'result';

function randomColor() {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)].id;
}

export function ColorSequenceGame() {
  const [sequence, setSequence] = useState<string[]>(() => [randomColor()]);
  const [phase, setPhase] = useState<Phase>('watch');
  const [lit, setLit] = useState<string | null>(null);
  const [playerStep, setPlayerStep] = useState(0);
  const [message, setMessage] = useState('Diziyi izle');
  const [level, setLevel] = useState(1);
  const playing = useRef(false);

  const playSequence = async (seq: string[]) => {
    playing.current = true;
    setPhase('watch');
    setMessage('Diziyi izle…');
    setPlayerStep(0);
    await wait(500);
    for (const id of seq) {
      setLit(id);
      await wait(550);
      setLit(null);
      await wait(220);
    }
    playing.current = false;
    setPhase('play');
    setMessage('Aynı sırayı dokun');
  };

  useEffect(() => {
    playSequence(sequence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTap = async (id: string) => {
    if (phase !== 'play' || playing.current) return;

    setLit(id);
    setTimeout(() => setLit(null), 180);

    if (id !== sequence[playerStep]) {
      setPhase('result');
      setMessage(`Yanlış! Seviye ${level}’de kaldın.`);
      return;
    }

    const nextStep = playerStep + 1;
    if (nextStep >= sequence.length) {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      setMessage(`Doğru! Seviye ${nextLevel}`);
      const nextSeq = [...sequence, randomColor()];
      setSequence(nextSeq);
      setPlayerStep(0);
      await wait(700);
      playSequence(nextSeq);
    } else {
      setPlayerStep(nextStep);
    }
  };

  const reset = () => {
    const first = [randomColor()];
    setSequence(first);
    setLevel(1);
    setPlayerStep(0);
    setMessage('Diziyi izle');
    playSequence(first);
  };

  return (
    <View>
      <View style={styles.scoreRow}>
        <Text style={styles.score}>Seviye {level}</Text>
        <Text style={styles.hint}>{message}</Text>
      </View>

      <View style={styles.grid}>
        {PALETTE.map((p) => {
          const active = lit === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => onTap(p.id)}
              disabled={phase === 'watch'}
              style={[
                styles.pad,
                { backgroundColor: p.color, opacity: active ? 1 : 0.45 },
                active && styles.padLit,
              ]}
            >
              <Text style={styles.padLabel}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {phase === 'result' ? (
        <PrimaryButton
          label="Yeniden başlat"
          onPress={reset}
          style={{ marginTop: spacing.md }}
        />
      ) : (
        <PrimaryButton
          label="Baştan izle"
          onPress={() => playSequence(sequence)}
          style={{
            marginTop: spacing.md,
            backgroundColor: colors.surfaceElevated,
          }}
        />
      )}
    </View>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: 8,
  },
  score: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 15,
    color: colors.text,
  },
  hint: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Lexend_400Regular',
    fontSize: 14,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pad: {
    width: '47%',
    aspectRatio: 1.2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padLit: {
    transform: [{ scale: 1.03 }],
    borderWidth: 3,
    borderColor: colors.mist,
  },
  padLabel: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 16,
    color: colors.bg,
  },
});

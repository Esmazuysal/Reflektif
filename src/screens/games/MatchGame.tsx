import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, radius } from '../../theme/colors';
import { PrimaryButton } from '../../components/ui';

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean };

const EMOJIS = ['🌿', '🌙', '☕', '📚', '🎵', '🏠'];

function buildCards(): Card[] {
  const pairs = EMOJIS.flatMap((emoji, i) => [
    { id: i * 2, emoji, flipped: false, matched: false },
    { id: i * 2 + 1, emoji, flipped: false, matched: false },
  ]);
  return pairs.sort(() => Math.random() - 0.5);
}

export function MatchGame() {
  const [cards, setCards] = useState<Card[]>(() => buildCards());
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const done = useMemo(
    () => cards.length > 0 && cards.every((c) => c.matched),
    [cards],
  );

  const onFlip = (index: number) => {
    if (selected.length === 2) return;
    if (cards[index].flipped || cards[index].matched) return;

    const next = cards.map((c, i) =>
      i === index ? { ...c, flipped: true } : c,
    );
    const nextSelected = [...selected, index];
    setCards(next);
    setSelected(nextSelected);

    if (nextSelected.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextSelected;
      if (next[a].emoji === next[b].emoji) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === a || i === b ? { ...c, matched: true } : c,
            ),
          );
          setSelected([]);
        }, 350);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === a || i === b ? { ...c, flipped: false } : c,
            ),
          );
          setSelected([]);
        }, 700);
      }
    }
  };

  const reset = () => {
    setCards(buildCards());
    setSelected([]);
    setMoves(0);
  };

  return (
    <View>
      <View style={styles.scoreRow}>
        <Text style={styles.score}>Hamle: {moves}</Text>
        {done ? (
          <Text style={styles.done}>Tebrikler!</Text>
        ) : (
          <Text style={styles.hint}>Kartları eşleştir</Text>
        )}
      </View>
      <View style={styles.grid}>
        {cards.map((card, index) => {
          const show = card.flipped || card.matched;
          return (
            <Pressable
              key={card.id}
              onPress={() => onFlip(index)}
              style={[
                styles.tile,
                show && styles.tileOpen,
                card.matched && styles.tileMatched,
              ]}
            >
              <Text style={styles.tileText}>{show ? card.emoji : '·'}</Text>
            </Pressable>
          );
        })}
      </View>
      <PrimaryButton
        label="Yeniden başlat"
        onPress={reset}
        style={{ marginTop: spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  score: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: colors.text,
  },
  done: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: colors.success,
  },
  hint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOpen: {
    backgroundColor: colors.surfaceElevated,
  },
  tileMatched: {
    borderColor: colors.success,
  },
  tileText: {
    fontSize: 22,
    color: colors.mistMuted,
  },
});

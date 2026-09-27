import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';
import { Panel, SectionTitle } from '../components/ui';
import { games } from '../api/types';
import { MatchGame } from './games/MatchGame';
import { WordMemoryGame } from './games/WordMemoryGame';
import { ColorSequenceGame } from './games/ColorSequenceGame';

export function GamesScreen() {
  const [activeGame, setActiveGame] = useState('g1');

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
            title="Zihinsel oyunlar"
            subtitle="Hafıza ve dikkat için sade egzersizler"
          />

          {games.map((g) => {
            const active = activeGame === g.id;
            return (
              <Panel
                key={g.id}
                style={
                  active
                    ? { ...styles.gameCard, ...styles.gameCardActive }
                    : styles.gameCard
                }
                onPress={() => setActiveGame(g.id)}
              >
                <View style={styles.gameRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gameTitle}>{g.title}</Text>
                    <Text style={styles.gameSub}>{g.subtitle}</Text>
                  </View>
                  <Text style={styles.duration}>
                    {active ? 'Açık' : g.duration}
                  </Text>
                </View>
              </Panel>
            );
          })}

          <Panel style={{ marginTop: spacing.md }}>
            {activeGame === 'g1' ? <MatchGame /> : null}
            {activeGame === 'g2' ? <WordMemoryGame /> : null}
            {activeGame === 'g3' ? <ColorSequenceGame /> : null}
          </Panel>
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
  gameCard: {
    marginBottom: spacing.sm,
  },
  gameCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gameTitle: {
    fontFamily: 'Lexend_600SemiBold',
    fontSize: 20,
    color: colors.text,
  },
  gameSub: {
    marginTop: 2,
    fontFamily: 'Lexend_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
  duration: {
    fontFamily: 'Lexend_500Medium',
    fontSize: 12,
    color: colors.accent,
  },
});

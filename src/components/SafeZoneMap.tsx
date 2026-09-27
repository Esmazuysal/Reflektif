import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../theme/colors';

type Props = {
  inSafeZone: boolean;
  name: string;
  radiusMeters: number;
  address: string;
};

export function SafeZoneMap({
  inSafeZone,
  name,
  radiusMeters,
  address,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.08],
  });

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#1B4A48', '#123636', '#0E2C2C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.map}
      >
        <View style={styles.gridH} />
        <View style={[styles.gridH, { top: '33%' }]} />
        <View style={[styles.gridH, { top: '66%' }]} />
        <View style={styles.gridV} />
        <View style={[styles.gridV, { left: '33%' }]} />
        <View style={[styles.gridV, { left: '66%' }]} />

        <View style={styles.zone}>
          <Animated.View
            style={[styles.pulse, { transform: [{ scale }], opacity }]}
          />
          <View style={styles.dot} />
        </View>

        <View style={styles.badge}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: inSafeZone ? colors.success : colors.danger,
              },
            ]}
          />
          <Text style={styles.badgeText}>
            {inSafeZone ? 'Güvenli alanda' : 'Alan dışında!'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.meta}>
        <Text style={styles.metaTitle}>{name}</Text>
        <Text style={styles.metaSub}>
          Yarıçap {radiusMeters} m · {address}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  map: {
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(232,242,240,0.06)',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
    backgroundColor: 'rgba(232,242,240,0.06)',
  },
  zone: {
    position: 'absolute',
    top: '42%',
    left: '48%',
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.map,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.mist,
  },
  badge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,42,42,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: {
    fontFamily: 'Lexend_500Medium',
    fontSize: 12,
    color: colors.mist,
  },
  meta: { marginTop: spacing.sm },
  metaTitle: {
    fontFamily: 'Lexend_700Bold',
    fontSize: 15,
    color: colors.text,
  },
  metaSub: {
    marginTop: 2,
    fontFamily: 'Lexend_400Regular',
    fontSize: 13,
    color: colors.textMuted,
  },
});

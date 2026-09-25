import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  samples: number[];
  height?: number;
  color?: string;
};

export function Sparkline({
  samples,
  height = 56,
  color = colors.heart,
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [samples, anim]);

  const max = Math.max(...samples, 1);
  const min = Math.min(...samples, 0);
  const range = Math.max(max - min, 1);

  return (
    <View style={[styles.wrap, { height }]}>
      {samples.map((v, i) => {
        const ratio = (v - min) / range;
        const barHeight = 10 + ratio * (height - 14);
        return (
          <Animated.View
            key={`${i}-${v}`}
            style={[
              styles.bar,
              {
                height: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, barHeight],
                }),
                backgroundColor: color,
                opacity: 0.35 + ratio * 0.65,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  bar: {
    flex: 1,
    borderRadius: 6,
  },
});

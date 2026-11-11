import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { PALETTE } from '@yatra/shared';

interface SplitFlapCharProps {
  char: string;
}

function SplitFlapChar({ char }: SplitFlapCharProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withSequence(
      withTiming(-90, { duration: 150 }),
      withTiming(0, { duration: 150 })
    );
  }, [char, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateX: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.charContainer}>
      {/* Top half */}
      <View style={styles.topHalf}>
        <Text style={styles.topText}>{char}</Text>
      </View>

      {/* Crease line */}
      <View style={styles.crease} />

      {/* Bottom half */}
      <View style={styles.bottomHalf}>
        <Text style={styles.bottomText}>{char}</Text>
      </View>

      <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]} />
    </View>
  );
}

interface SplitFlapDisplayProps {
  text: string;
  padLength?: number;
  label?: string;
}

export function SplitFlapDisplay({ text, padLength = 8, label }: SplitFlapDisplayProps) {
  const padded = text.toUpperCase().padEnd(padLength, ' ').slice(0, padLength);
  const chars = padded.split('');

  return (
    <View style={styles.board}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {chars.map((c, i) => (
          <SplitFlapChar key={i} char={c} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#111427',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 78, 0.4)',
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: PALETTE.brass,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  charContainer: {
    width: 22,
    height: 32,
    backgroundColor: PALETTE.coal,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#000000',
    marginHorizontal: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  topHalf: {
    height: 16,
    backgroundColor: '#1e222a',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bottomHalf: {
    height: 16,
    backgroundColor: '#15181f',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  crease: {
    position: 'absolute',
    top: 15.5,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  topText: {
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 18,
    color: '#FBBF24',
    transform: [{ translateY: 9 }],
  },
  bottomText: {
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 18,
    color: '#FBBF24',
    transform: [{ translateY: -9 }],
  },
});

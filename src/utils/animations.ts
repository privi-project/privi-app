import { Animated } from 'react-native';

export const createPulseAnimation = () => {
  const pulse = new Animated.Value(1);

  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.15,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]),
    { iterations: -1 }
  ).start();

  return pulse;
};

export const easeInOutCubic = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

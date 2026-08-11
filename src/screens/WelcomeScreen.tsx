import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/colors';
import { SplashAnimation } from '@/components/SplashAnimation';
import { BrandMark } from '@/components/BrandMark';
import { GoldGradientText, GoldGradientBorder } from '@/components/GoldGradient';
import { useAppColorScheme } from '@/hooks/useAppColorScheme';

const WEBSITE_SIGNUP_URL = 'https://privi.info/signup';

// Already-signed-in members never reach this screen at all — the root
// layout intercepts before Welcome mounts and shows a destination='home'
// overlay instead (see app/_layout.tsx). Welcome's own splash always
// plays to completion here since only not-signed-in users get this far.
export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const [showSplash, setShowSplash] = useState(true);
  const buttonsOpacity = React.useRef(new Animated.Value(0)).current;

  const theme = colorScheme === 'dark' ? 'dark' : 'light';

  const handleSplashComplete = () => {
    setShowSplash(false);
    Animated.timing(buttonsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCreateAccount = async () => {
    // Opens external browser (not in-app WebView) to website signup
    await Linking.openURL(WEBSITE_SIGNUP_URL);
  };

  const handleLogIn = () => {
    router.push('/sign-in');
  };

  const backgroundColor = theme === 'dark' ? COLORS.charcoal : COLORS.ivory;
  const textColor = theme === 'dark' ? COLORS.ivory : COLORS.charcoal;

  if (showSplash) {
    return <SplashAnimation onComplete={handleSplashComplete} theme={theme} />;
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.lockup}>
        <BrandMark size="md" on={theme === 'dark' ? 'dark' : 'light'} />
        <GoldGradientText style={styles.motto}>More for you.{'\n'}Every day.</GoldGradientText>
      </View>

      <Animated.View style={[styles.buttonsContainer, { opacity: buttonsOpacity }]}>
        <GoldGradientBorder backgroundColor={COLORS.teal} borderRadius={8}>
          <Pressable style={styles.primaryButton} onPress={handleCreateAccount}>
            <Text style={styles.primaryButtonText}>Create account</Text>
          </Pressable>
        </GoldGradientBorder>
        <GoldGradientBorder backgroundColor={backgroundColor} borderRadius={8}>
          <Pressable style={styles.secondaryButton} onPress={handleLogIn}>
            <Text style={[styles.secondaryButtonText, { color: textColor }]}>Log in</Text>
          </Pressable>
        </GoldGradientBorder>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockup: {
    alignItems: 'center',
    marginTop: -90,
  },
  motto: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    paddingTop: 10,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.ivory,
    fontSize: 15,
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';

export default function SplashScreen() {
  const { width } = useWindowDimensions();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const titleSlide = useRef(new Animated.Value(30)).current;
  const subtitleSlide = useRef(new Animated.Value(20)).current;
  const footerFade = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      // 1. Logo fades in + scales up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // 2. Title slides up
      Animated.parallel([
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(subtitleSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
      // 3. Footer fades in
      Animated.timing(footerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing dots loader
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ]),
      );
    animateDot(dot1, 0).start();
    animateDot(dot2, 150).start();
    animateDot(dot3, 300).start();

    // Navigate after splash
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2800);

    return () => clearTimeout(timer);
  }, [fadeAnim, logoScale, titleSlide, subtitleSlide, footerFade, dot1, dot2, dot3]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" translucent={false} />

      {/* Subtle gradient overlay using layered views */}
      <View style={[s.gradientTop, { width }]} />

      {/* Center content */}
      <View style={s.center}>
        {/* Logo */}
        <Animated.View
          style={[
            s.logoWrap,
            {
              opacity: fadeAnim,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={s.logoCard}>
            <Image
              source={require('../../assets/images/512.png')}
              style={s.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: titleSlide }],
          }}
        >
          <Text style={s.title}>M2C Store</Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: subtitleSlide }],
          }}
        >
          <Text style={s.subtitle}>Your Shopping Destination</Text>
        </Animated.View>

        {/* Animated loading dots */}
        <Animated.View style={[s.dotsRow, { opacity: fadeAnim }]}>
          <Animated.View style={[s.dot, { opacity: dot1 }]} />
          <Animated.View style={[s.dot, { opacity: dot2 }]} />
          <Animated.View style={[s.dot, { opacity: dot3 }]} />
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View style={[s.footer, { opacity: footerFade }]}>
        <Text style={s.footerText}>Powered by M2C Commerce</Text>
        <Text style={s.footerCopy}>
          {'\u00A9'} {new Date().getFullYear()} All rights reserved
        </Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111827',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    marginBottom: 32,
  },
  logoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  logoImage: {
    width: 160,
    height: 110,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 40,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4b5563',
    textAlign: 'center',
  },
  footerCopy: {
    fontSize: 11,
    fontWeight: '400',
    color: '#374151',
    textAlign: 'center',
    marginTop: 4,
  },
});

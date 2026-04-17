import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StatusBar, Dimensions } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stage 1: Logo fades in + scales up (0 → 500ms)
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      // Stage 2: Text appears + loading bar fills (500ms → 1500ms)
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(barWidth, { toValue: 1, duration: 1200, useNativeDriver: false }),
      ]).start();
    });

    // Navigate after 1.8s
    const checkAuth = async () => {
      try {
        const checkerId = await AsyncStorage.getItem('checkerID');
        setTimeout(() => {
          router.replace(checkerId ? '/(tabs)' : '/(auth)/Login');
        }, 1800);
      } catch {
        setTimeout(() => router.replace('/(auth)/Login'), 1800);
      }
    };
    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>

      {/* Logo */}
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={require('../../assets/images/512.png')}
            style={{ width: 64, height: 64 }}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Brand text */}
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 28 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: '800',
            color: '#ffffff',
            letterSpacing: 2,
          }}
        >
          M2C
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: '#525252',
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginTop: 6,
          }}
        >
          Quality Checker
        </Text>
      </Animated.View>

      {/* Loading bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 80,
          width: width * 0.3,
          height: 2,
          backgroundColor: '#1a1a1a',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: '#404040',
            borderRadius: 1,
            width: barWidth.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          }}
        />
      </View>

      {/* Footer */}
      <View style={{ position: 'absolute', bottom: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 9, color: '#333333', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          M2C MarkDowns Pvt Ltd
        </Text>
      </View>
    </View>
  );
}

import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, Easing, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    // Check authentication and navigate
    const checkAuth = async () => {
      try {
        const checkerId = await AsyncStorage.getItem('checkerID');
        
        setTimeout(() => {
          if (checkerId) {
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/Login');
          }
        }, 2500);
      } catch (error) {
        setTimeout(() => {
          router.replace('/(auth)/Login');
        }, 2500);
      }
    };

    checkAuth();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  return (
    <SafeAreaProvider className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          }}
          className="items-center"
        >
          {/* Logo Container */}
          <View className="bg-white rounded-3xl p-4 mb-8 shadow-2xl">
            <Image
              source={require('../../assets/images/512.png')}
              className="w-52 h-36"
              resizeMode="contain"
            />
          </View>

          {/* App Title */}
          <Text className="text-4xl font-bold text-white mb-3 text-center">
            QC Checker
          </Text>
          
          <Text className="text-base text-gray-400 text-center mb-8">
            Quality Control Portal
          </Text>

          {/* Loading Indicator */}
          <View className="flex-row items-center space-x-2">
            <View className="w-2 h-2 bg-white rounded-full opacity-40" />
            <View className="w-2 h-2 bg-white rounded-full opacity-60" />
            <View className="w-2 h-2 bg-white rounded-full opacity-80" />
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          style={{ opacity: fadeAnim }}
          className="absolute bottom-10"
        >
          <Text className="text-xs text-gray-600 text-center">
            Powered by Quality Assurance Team
          </Text>
          <Text className="text-xs text-gray-700 text-center mt-1">
            © {new Date().getFullYear()} All rights reserved
          </Text>
        </Animated.View>
      </View>
    </SafeAreaProvider>
  );
}

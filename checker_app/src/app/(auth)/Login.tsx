import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  StatusBar,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { User, Lock, LogIn, Shield } from 'lucide-react-native';

const MOCK_CHECKERS = ['CHECKER_001', 'CHECKER_002', 'CHECKER_003', 'CHECKER_004'];
const DEMO_PASSWORD = 'demo123';

export default function LoginScreen() {
  const [checkerId, setCheckerId] = useState('');
  const [password, setPassword] = useState('');
  const [checkerIdError, setCheckerIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();

  const validateCheckerId = useCallback((value: string) => {
    if (!value) {
      setCheckerIdError('Please enter your Checker ID');
      return false;
    }

    const regex = /^CHECKER_\d{3}$/;
    if (!regex.test(value.toUpperCase())) {
      setCheckerIdError('Invalid format. Use CHECKER_XXX format');
      return false;
    }

    setCheckerIdError('');
    return true;
  }, []);

  const validatePassword = useCallback((value: string) => {
    if (!value) {
      setPasswordError('Please enter your password');
      return false;
    }

    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }

    setPasswordError('');
    return true;
  }, []);

  const handleSubmit = useCallback(async () => {
    const normalizedId = checkerId.trim().toUpperCase();
    const isIdValid = validateCheckerId(normalizedId);
    const isPasswordValid = validatePassword(password.trim());

    if (!isIdValid || !isPasswordValid) {
      return;
    }

    if (!MOCK_CHECKERS.includes(normalizedId) || password.trim() !== DEMO_PASSWORD) {
      Alert.alert('Invalid credentials', 'Please check your Checker ID and password.');
      return;
    }

    try {
      setSubmitting(true);
      await AsyncStorage.setItem('checkerID', normalizedId);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Unable to save session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [checkerId, password, validateCheckerId, validatePassword]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={20}
      >
        <View className="px-6 py-8">
          {/* Logo Section */}
          <View className="items-center mb-8 mt-4">
            <View className="bg-white rounded-2xl p-4 mb-4 shadow-2xl">
              <Image 
                source={require('../../../assets/images/logo4.png')}
                className="w-48 h-36"
                resizeMode="contain"
              />
            </View>
            <Text className="text-2xl font-bold text-white mb-1">QC Checker</Text>
            <Text className="text-sm text-gray-400 text-center">
              Quality Control Portal
            </Text>
          </View>

          {/* Login Card */}
          <View className="bg-white rounded-2xl p-5 shadow-2xl">
            <View className="flex-row items-center mb-5">
              <View className="bg-black rounded-full p-2 mr-3">
                <Shield size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-lg font-bold text-black">Sign In</Text>
                <Text className="text-xs text-gray-600">Access your dashboard</Text>
              </View>
            </View>

            {/* Checker ID Input */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-800 mb-2">
                Checker ID
              </Text>
              <View className={`flex-row items-center bg-gray-50 rounded-xl px-3 py-3 border ${
                checkerIdError ? 'border-red-500' : 'border-gray-300'
              }`}>
                <User size={18} color="#6b7280" strokeWidth={2} />
                <TextInput
                  value={checkerId}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setCheckerId(value.toUpperCase());
                    if (checkerIdError) {
                      setCheckerIdError('');
                    }
                  }}
                  onBlur={() => validateCheckerId(checkerId)}
                  placeholder="e.g. CHECKER_001"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-3 text-sm text-black"
                />
              </View>
              {!!checkerIdError && (
                <View className="flex-row items-center mt-1.5">
                  <View className="bg-red-500 rounded-full w-1 h-1 mr-2" />
                  <Text className="text-xs text-red-500">{checkerIdError}</Text>
                </View>
              )}
            </View>

            {/* Password Input */}
            <View className="mb-5">
              <Text className="text-xs font-semibold text-gray-800 mb-2">
                Password
              </Text>
              <View className={`flex-row items-center bg-gray-50 rounded-xl px-3 py-3 border ${
                passwordError ? 'border-red-500' : 'border-gray-300'
              }`}>
                <Lock size={18} color="#6b7280" strokeWidth={2} />
                <TextInput
                  value={password}
                  secureTextEntry
                  onChangeText={(value) => {
                    setPassword(value);
                    if (passwordError) {
                      setPasswordError('');
                    }
                  }}
                  onBlur={() => validatePassword(password)}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-3 text-sm text-black"
                />
              </View>
              {!!passwordError && (
                <View className="flex-row items-center mt-1.5">
                  <View className="bg-red-500 rounded-full w-1 h-1 mr-2" />
                  <Text className="text-xs text-red-500">{passwordError}</Text>
                </View>
              )}
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              disabled={submitting}
              onPress={handleSubmit}
              className={`rounded-xl py-3.5 items-center justify-center flex-row shadow-lg ${
                submitting ? 'bg-gray-400' : 'bg-black'
              }`}
            >
              <LogIn size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="font-bold text-sm ml-2 text-white">
                {submitting ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Demo Credentials */}
          {/* <View className="mt-6 bg-gray-900 rounded-2xl p-4 border border-gray-800">
            <View className="flex-row items-center mb-2.5">
              <View className="bg-blue-500 rounded-full w-1.5 h-1.5 mr-2" />
              <Text className="text-xs font-bold text-gray-300">
                Demo Credentials
              </Text>
            </View>
            <View>
              <View className="mb-2">
                <Text className="text-xs text-gray-500 mb-1">Checker IDs:</Text>
                <Text className="text-xs text-gray-400 leading-4">
                  {MOCK_CHECKERS.join(', ')}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-500 mr-2">Password:</Text>
                <View className="bg-gray-800 px-2 py-1 rounded">
                  <Text className="text-xs text-white font-bold">demo123</Text>
                </View>
              </View>
            </View>
          </View> */}

          {/* Footer */}
          <View className="mt-5 items-center pb-2">
            <Text className="text-xs text-gray-600">
              © {currentYear} QC Checker. All rights reserved.
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

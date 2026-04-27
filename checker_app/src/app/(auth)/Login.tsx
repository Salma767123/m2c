import React, { useCallback, useState } from 'react';
import {
  Alert,
  Text,
  TextInput,
  Pressable,
  View,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Lock, LogIn, Shield, Eye, EyeOff } from 'lucide-react-native';
import { qcCheckerService } from '../../services/qcCheckerService';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [checkerId, setCheckerId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkerIdError, setCheckerIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const currentYear = new Date().getFullYear();

  const validateCheckerId = useCallback((value: string) => {
    if (!value) {
      setCheckerIdError('Checker ID is required');
      return false;
    }
    setCheckerIdError('');
    return true;
  }, []);

  const validatePassword = useCallback((value: string) => {
    if (!value) {
      setPasswordError('Password is required');
      return false;
    }
    setPasswordError('');
    return true;
  }, []);

  const handleSubmit = useCallback(async () => {
    const normalizedId = checkerId.trim().toUpperCase();
    const trimmedPassword = password.trim();
    
    const isIdValid = validateCheckerId(normalizedId);
    const isPasswordValid = validatePassword(trimmedPassword);

    if (!isIdValid || !isPasswordValid) {
      return;
    }

    try {
      setSubmitting(true);
      const result = await qcCheckerService.login({
        checkerId: normalizedId,
        password: trimmedPassword,
      });

      if (result.success && result.data) {
        await qcCheckerService.storeCheckerAuth(result.data.token, result.data.checker);
        
        // Register for push notifications (optional, don't block login)
        try {
          const notificationService = await import('@/services/notificationService');
          notificationService.registerForPushNotifications().catch(console.error);
        } catch {
          console.log('Push notification registration skipped');
        }
        
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid credentials. Please check your Checker ID and password.';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [checkerId, password, validateCheckerId, validatePassword]);

  return (
    <View className="flex-1 bg-slate-900" style={{ paddingTop: insets.top }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={80}
      >
        <View className="px-6 py-8">
          {/* Logo Section */}
          <View className="items-center mb-8 mt-4" style={{ gap: 16 }}>
            <View 
              className="bg-white rounded-2xl p-4 shadow-2xl"
              style={{ borderCurve: 'continuous' }}
            >
              <Image 
                source={require('../../../assets/images/logo4.png')}
                className="w-48 h-36"
                resizeMode="contain"
              />
            </View>
            <View style={{ gap: 4 }}>
              <Text className="text-2xl font-bold text-white text-center">QC Checker</Text>
              <Text className="text-sm text-slate-400 text-center">
                Quality Control Portal
              </Text>
            </View>
          </View>

          {/* Login Card */}
          <View 
            className="bg-white rounded-2xl p-6 shadow-2xl"
            style={{ borderCurve: 'continuous', gap: 20 }}
          >
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <View 
                className="bg-slate-900 rounded-full p-2"
                style={{ borderCurve: 'continuous' }}
              >
                <Shield size={20} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View style={{ gap: 2 }}>
                <Text className="text-lg font-bold text-slate-900">Sign In</Text>
                <Text className="text-xs text-slate-600">Access your dashboard</Text>
              </View>
            </View>

            {/* Checker ID Input */}
            <View style={{ gap: 8 }}>
              <Text className="text-xs font-semibold text-slate-700">
                Checker ID
              </Text>
              <View 
                className={`flex-row items-center bg-slate-50 rounded-xl px-3 py-3 border ${
                  checkerIdError ? 'border-red-400' : 'border-slate-300'
                }`}
                style={{ borderCurve: 'continuous', gap: 12 }}
              >
                <User size={18} color="#64748b" strokeWidth={2} />
                <TextInput
                  value={checkerId}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setCheckerId(value.toUpperCase());
                    if (checkerIdError) setCheckerIdError('');
                  }}
                  onBlur={() => validateCheckerId(checkerId)}
                  placeholder="e.g. QC-001"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-sm text-slate-900"
                  editable={!submitting}
                />
              </View>
              {!!checkerIdError && (
                <Text className="text-xs text-red-600">{checkerIdError}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={{ gap: 8 }}>
              <Text className="text-xs font-semibold text-slate-700">
                Password
              </Text>
              <View 
                className={`flex-row items-center bg-slate-50 rounded-xl px-3 py-3 border ${
                  passwordError ? 'border-red-400' : 'border-slate-300'
                }`}
                style={{ borderCurve: 'continuous', gap: 12 }}
              >
                <Lock size={18} color="#64748b" strokeWidth={2} />
                <TextInput
                  value={password}
                  secureTextEntry={!showPassword}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (passwordError) setPasswordError('');
                  }}
                  onBlur={() => validatePassword(password)}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-sm text-slate-900"
                  editable={!submitting}
                />
                <Pressable 
                  onPress={() => setShowPassword(!showPassword)} 
                  disabled={submitting}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748b" />
                  ) : (
                    <Eye size={18} color="#64748b" />
                  )}
                </Pressable>
              </View>
              {!!passwordError && (
                <Text className="text-xs text-red-600">{passwordError}</Text>
              )}
            </View>

            {/* Sign In Button */}
            <Pressable
              disabled={submitting}
              onPress={handleSubmit}
              style={{
                marginTop: 8,
                height: 56,
                backgroundColor: submitting ? '#94a3b8' : '#2563eb',
                borderRadius: 16,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                elevation: 4,
                shadowColor: '#2563eb',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <LogIn size={20} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text className="font-bold text-base text-white">
                {submitting ? 'Signing in...' : 'Sign In'}
              </Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="mt-6 items-center">
            <Text className="text-xs text-slate-400">
              © {currentYear} QC Checker. All rights reserved.
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

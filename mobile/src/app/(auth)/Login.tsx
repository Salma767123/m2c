import React, { useCallback, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  StatusBar,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Lock, LogIn, ShoppingBag, Eye, EyeOff } from 'lucide-react-native';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

const MOCK_USERS = ['customer@demo.com', 'user@test.com', 'demo@m2c.com', 'test@example.com'];
const DEMO_PASSWORD = 'demo123';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const currentYear = new Date().getFullYear();

  const validateEmail = useCallback((value: string) => {
    if (!value) {
      setEmailError('Please enter your email address');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    setEmailError('');
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
    const normalizedEmail = email.trim().toLowerCase();
    const isEmailValid = validateEmail(normalizedEmail);
    const isPasswordValid = validatePassword(password.trim());

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      setSubmitting(true);

      // Try actual API login first
      try {
        const response = await userAuthService.login({
          email: normalizedEmail,
          password: password.trim(),
        });

        if (response.success && response.data) {
          // Store auth data using the service
          await userAuthService.storeAuthData(
            response.data.token,
            response.data.user,
            true // rememberMe
          );

          showSuccessToast('Welcome Back!', `Logged in as ${response.data.user.name}`);
          router.replace('/(tabs)');
          return;
        }
      } catch (apiError: any) {
        console.log('API login failed, trying mock login:', apiError.message);
        
        // Fallback to mock login for demo
        if (!MOCK_USERS.includes(normalizedEmail) || password.trim() !== DEMO_PASSWORD) {
          showErrorToast('Invalid Credentials', 'Please check your email and password.');
          return;
        }

        // Mock successful login
        const mockUser = {
          id: 'mock_user_123',
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          role: 'user' as const,
          isVerified: true,
        };

        const mockToken = 'mock_token_' + Date.now();

        // Store mock auth data
        await userAuthService.storeAuthData(mockToken, mockUser, true);
        
        showSuccessToast('Welcome!', `Logged in as ${mockUser.name}`);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      showErrorToast('Login Failed', error.message || 'Unable to login. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, validateEmail, validatePassword]);

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
            <Text className="text-2xl font-bold text-white mb-1">M2C Store</Text>
            <Text className="text-sm text-gray-400 text-center">
              Your Shopping Destination
            </Text>
          </View>

          {/* Login Card */}
          <View className="bg-white rounded-2xl p-5 shadow-2xl">
            <View className="flex-row items-center mb-5">
              <View className="bg-black rounded-full p-2 mr-3">
                <ShoppingBag size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-lg font-bold text-black">Welcome Back</Text>
                <Text className="text-xs text-gray-600">Sign in to your account</Text>
              </View>
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-800 mb-2">
                Email Address
              </Text>
              <View className={`flex-row items-center bg-gray-50 rounded-xl px-3 py-3 border ${
                emailError ? 'border-red-500' : 'border-gray-300'
              }`}>
                <User size={18} color="#6b7280" strokeWidth={2} />
                <TextInput
                  value={email}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={(value) => {
                    setEmail(value.toLowerCase());
                    if (emailError) {
                      setEmailError('');
                    }
                  }}
                  onBlur={() => validateEmail(email)}
                  placeholder="Enter your email"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 ml-3 text-sm text-black"
                />
              </View>
              {!!emailError && (
                <View className="flex-row items-center mt-1.5">
                  <View className="bg-red-500 rounded-full w-1 h-1 mr-2" />
                  <Text className="text-xs text-red-500">{emailError}</Text>
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
                  secureTextEntry={!showPassword}
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
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="ml-2"
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#6b7280" strokeWidth={2} />
                  ) : (
                    <Eye size={18} color="#6b7280" strokeWidth={2} />
                  )}
                </TouchableOpacity>
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
              © {currentYear} M2C Store. All rights reserved.
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

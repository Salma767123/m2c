import React, { useCallback, useEffect, useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  User,
  Lock,
  LogIn,
  ShoppingBag,
  Eye,
  EyeOff,
} from "lucide-react-native";
import Constants from "expo-constants";
import { userAuthService } from "@/services/userAuthService";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";

// Expo Go can't load native modules. Lazy-require so the app still boots there;
// Google Sign-In is disabled in Expo Go and works only in dev-client / release builds.
const IS_EXPO_GO = Constants.appOwnership === "expo";
let GoogleSignin: any = null;
let isSuccessResponse: ((r: any) => boolean) | null = null;
let isErrorWithCode: ((e: any) => boolean) | null = null;
let statusCodes: any = null;
if (!IS_EXPO_GO) {
  try {
    const mod = require("@react-native-google-signin/google-signin");
    GoogleSignin = mod.GoogleSignin;
    isSuccessResponse = mod.isSuccessResponse;
    isErrorWithCode = mod.isErrorWithCode;
    statusCodes = mod.statusCodes;
  } catch {
    // Module not installed in this binary — Google Sign-In stays hidden.
  }
}
const GOOGLE_SIGNIN_AVAILABLE = !!GoogleSignin;

// Firebase push notifications — fails gracefully in Expo Go
let registerForPushNotifications: (() => Promise<string | null>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ns = require("@/services/notificationService");
  registerForPushNotifications = ns.registerForPushNotifications;
} catch {
  // Firebase not available
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const currentYear = new Date().getFullYear();
  const { refreshCart } = useCart();
  const { refreshWishlist } = useWishlist();

  // Trigger context refresh after a successful login so guest cart/wishlist
  // items migrate to the server copy before navigation.
  const hydrateAfterLogin = async () => {
    await Promise.all([refreshCart(), refreshWishlist()]);
  };

  useEffect(() => {
    if (GOOGLE_SIGNIN_AVAILABLE) {
      GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_ID });
    }
  }, []);

  const handleGoogleSignIn = async () => {
    if (!GOOGLE_SIGNIN_AVAILABLE) {
      showErrorToast(
        "Unavailable in Expo Go",
        "Google Sign-In needs a dev build. Use email/password or run with a dev client.",
      );
      return;
    }
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse!(response)) {
        const { user } = response.data;

        const result = await userAuthService.googleLogin({
          googleId: user.id,
          email: user.email,
          name: user.name || user.email.split("@")[0],
          image: user.photo || undefined,
        });

        if (result.success && result.data) {
          await userAuthService.storeAuthData(
            result.data.token,
            result.data.user,
            true,
          );
          await hydrateAfterLogin();
          registerForPushNotifications?.().catch(() => {});
          showSuccessToast("Welcome!", `Signed in as ${result.data.user.name}`);
          router.replace("/(tabs)");
        }
      }
    } catch (error: any) {
      if (isErrorWithCode!(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) return;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          showErrorToast("Error", "Google Play Services not available.");
          return;
        }
      }
      console.error("Google sign-in error:", error);
      showErrorToast("Login Failed", error.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateEmail = useCallback((value: string) => {
    if (!value) {
      setEmailError("Please enter your email address");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  }, []);

  const validatePassword = useCallback((value: string) => {
    if (!value) {
      setPasswordError("Please enter your password");
      return false;
    }
    if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  }, []);

  const handleSubmit = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const isEmailValid = validateEmail(normalizedEmail);
    const isPasswordValid = validatePassword(password.trim());

    if (!isEmailValid || !isPasswordValid) return;

    try {
      setSubmitting(true);

      const response = await userAuthService.login({
        email: normalizedEmail,
        password: password.trim(),
      });

      if (response.success && response.data) {
        await userAuthService.storeAuthData(
          response.data.token,
          response.data.user,
          true,
        );
        await hydrateAfterLogin();
        registerForPushNotifications?.().catch(() => {});
        showSuccessToast(
          "Welcome Back!",
          `Logged in as ${response.data.user.name}`,
        );
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      showErrorToast(
        "Login Failed",
        error.message || "Invalid credentials. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [email, password, validateEmail, validatePassword]);

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000000"
        translucent={false}
      />
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
                source={require("../../../assets/images/logo4.png")}
                className="w-48 h-36"
                resizeMode="contain"
              />
            </View>
            <Text className="text-2xl font-bold text-white mb-1">
              M2C Store
            </Text>
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
                <Text className="text-lg font-bold text-black">
                  Welcome Back
                </Text>
                <Text className="text-xs text-gray-600">
                  Sign in to your account
                </Text>
              </View>
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-800 mb-2">
                Email Address
              </Text>
              <View
                className={`flex-row items-center bg-gray-50 rounded-xl px-3 py-3 border ${
                  emailError ? "border-red-500" : "border-gray-300"
                }`}
              >
                <User size={18} color="#6b7280" strokeWidth={2} />
                <TextInput
                  value={email}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={(value) => {
                    setEmail(value.toLowerCase());
                    if (emailError) setEmailError("");
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
              <View
                className={`flex-row items-center bg-gray-50 rounded-xl px-3 py-3 border ${
                  passwordError ? "border-red-500" : "border-gray-300"
                }`}
              >
                <Lock size={18} color="#6b7280" strokeWidth={2} />
                <TextInput
                  value={password}
                  secureTextEntry={!showPassword}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (passwordError) setPasswordError("");
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
                submitting ? "bg-gray-400" : "bg-black"
              }`}
            >
              <LogIn size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="font-bold text-sm ml-2 text-white">
                {submitting ? "Signing in..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            {GOOGLE_SIGNIN_AVAILABLE ? (
              <>
                {/* Divider */}
                <View className="flex-row items-center my-5">
                  <View className="flex-1 h-px bg-gray-300" />
                  <Text className="mx-4 text-xs text-gray-500 font-medium">
                    OR
                  </Text>
                  <View className="flex-1 h-px bg-gray-300" />
                </View>

                {/* Google Sign-In Button */}
                <TouchableOpacity
                  disabled={googleLoading}
                  onPress={handleGoogleSignIn}
                  className={`rounded-xl py-3.5 items-center justify-center flex-row border border-gray-300 ${
                    googleLoading ? "bg-gray-100" : "bg-white"
                  }`}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color="#4285F4" />
                  ) : (
                    <Image
                      source={{
                        uri: "https://developers.google.com/identity/images/g-logo.png",
                      }}
                      style={{ width: 20, height: 20 }}
                    />
                  )}
                  <Text className="font-bold text-sm ml-3 text-gray-700">
                    {googleLoading ? "Signing in..." : "Continue with Google"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          {/* Footer */}
          <View className="mt-5 items-center pb-2">
            <Text className="text-xs text-gray-600">
              {"\u00A9"} {currentYear} M2C Store. All rights reserved.
            </Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

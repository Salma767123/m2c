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
  Check,
  AlertCircle,
  X,
} from "lucide-react-native";
import { userAuthService } from "@/services/userAuthService";
import { companyInfoService } from "@/services/companyInfoService";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { useGoogleAuth } from "@/lib/googleAuth";

const STATIC_LOGO = require("../../../assets/images/logo4.png");
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

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
  const [showPassword, setShowPassword] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  // Matches the web's LoginForm: the box decides whether the session survives
  // a restart, so it defaults to off rather than silently opting everyone in.
  const [rememberMe, setRememberMe] = useState(false);
  // Set when the server answers a password login with GOOGLE_ACCOUNT — the
  // credentials aren't wrong, the account simply has no password to check.
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null);

  const {
    available: GOOGLE_SIGNIN_AVAILABLE,
    loading: googleLoading,
    signIn: handleGoogleSignIn,
  } = useGoogleAuth();

  // Load dynamic company logo (cached first, then fresh from API)
  useEffect(() => {
    companyInfoService.getCachedCompanyInfo().then((info) => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo);
    });
    companyInfoService.getPublicCompanyInfo().then((info) => {
      if (info.companyLogo) setCompanyLogo(info.companyLogo);
    }).catch(() => {});
  }, []);
  const currentYear = new Date().getFullYear();
  const { refreshCart } = useCart();
  const { refreshWishlist } = useWishlist();

  // Trigger context refresh after a successful login so guest cart/wishlist
  // items migrate to the server copy before navigation.
  const hydrateAfterLogin = async () => {
    await Promise.all([refreshCart(), refreshWishlist()]);
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
    // 8, matching the web's LoginForm and the 8 that Register enforces on both
    // clients. Mobile previously accepted 6 here, so a password this app would
    // refuse to create was still allowed through its own sign-in form.
    if (value.length < 8) {
      setPasswordError("Password must be at least 8 characters");
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

    setGoogleAccountEmail(null);

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
          rememberMe,
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
      // A Google-created account has no password to check, so "invalid
      // credentials" is the wrong answer — it sends the user off to reset a
      // password that does not exist. The web surfaces this as its own panel;
      // so does this screen now.
      const errorCode = error?.data?.code;
      if (errorCode === "GOOGLE_ACCOUNT") {
        setGoogleAccountEmail(normalizedEmail);
        showErrorToast(
          "Google Account",
          "This account was created with Google sign-in. Please use the Google button to log in.",
        );
        return;
      }

      console.error("Login error:", error);
      showErrorToast(
        "Login Failed",
        error.message || "Invalid credentials. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [email, password, rememberMe, validateEmail, validatePassword]);

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
            {/* White plate behind the mark — logo4.png is black line art on a
                transparent background and is invisible on this black canvas
                without it. Matches AuthKit and the splash screen. */}
            <View className="mb-4 bg-white rounded-3xl px-5 py-3">
              <Image
                source={companyLogo ? { uri: companyLogo } : STATIC_LOGO}
                className="w-44 h-28"
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
              <View className="bg-brand-500 rounded-full p-2 mr-3">
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

            {/* Google Account Notice — mirrors the web's panel. Shown only
                after the server tells us this address is a Google account. */}
            {googleAccountEmail ? (
              <View className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <View className="flex-row">
                  <AlertCircle size={16} color="#2563eb" strokeWidth={2} />
                  <View className="flex-1 ml-2.5">
                    <Text className="text-xs font-bold text-blue-900 mb-1">
                      Google Account Detected
                    </Text>
                    <Text className="text-xs text-blue-800 leading-4">
                      The account{" "}
                      <Text className="font-semibold">{googleAccountEmail}</Text>{" "}
                      was created using Google sign-in. Please continue with
                      Google to log in.
                    </Text>

                    {GOOGLE_SIGNIN_AVAILABLE ? (
                      <TouchableOpacity
                        disabled={googleLoading}
                        onPress={handleGoogleSignIn}
                        className="mt-2.5 flex-row items-center justify-center rounded-lg border border-gray-300 bg-white py-2.5"
                        accessibilityRole="button"
                        accessibilityLabel="Continue with Google"
                      >
                        {googleLoading ? (
                          <ActivityIndicator size="small" color="#4285F4" />
                        ) : (
                          <Image
                            source={{
                              uri: "https://developers.google.com/identity/images/g-logo.png",
                            }}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                        <Text className="ml-2 text-xs font-bold text-gray-700">
                          Continue with Google
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => setGoogleAccountEmail(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss"
                  >
                    <X size={14} color="#60a5fa" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

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
                    // The notice belongs to the address that triggered it.
                    if (googleAccountEmail) setGoogleAccountEmail(null);
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

            {/* Remember me + Forgot password — the web pairs these on one row. */}
            <View className="-mt-3 mb-4 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setRememberMe((v) => !v)}
                className="flex-row items-center"
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
                accessibilityLabel="Remember me"
                hitSlop={6}
              >
                <View
                  className={`w-4 h-4 rounded items-center justify-center mr-2 border ${
                    rememberMe
                      ? "bg-brand-500 border-brand-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {rememberMe ? (
                    <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  ) : null}
                </View>
                <Text className="text-xs text-gray-600">Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/ForgotPassword")}
                activeOpacity={0.7}
                accessibilityRole="link"
                accessibilityLabel="Forgot your password"
                hitSlop={6}
              >
                <Text className="text-xs font-semibold text-brand-500">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              disabled={submitting}
              onPress={handleSubmit}
              className={`rounded-xl py-3.5 items-center justify-center flex-row shadow-lg ${
                submitting ? "bg-gray-400" : "bg-brand-500"
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

          {/* Create account */}
          <View className="mt-5 flex-row items-center justify-center">
            <Text className="text-xs text-gray-400">
              Don&apos;t have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/Register")}
              activeOpacity={0.7}
              accessibilityRole="link"
              accessibilityLabel="Create an account"
            >
              <Text className="text-xs font-bold text-brand-400">Sign Up</Text>
            </TouchableOpacity>
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

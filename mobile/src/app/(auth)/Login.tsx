import React, { useCallback, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { AlertCircle, X } from 'lucide-react-native';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { useGoogleAuth } from '@/lib/googleAuth';
import {
  AuthShell,
  AuthField,
  AuthButton,
  AuthCheckbox,
  AuthDivider,
  AuthSwitch,
  GoogleButton,
  EMAIL_RE,
} from '@/components/WebSite/Auth/AuthKit';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Fonts } from '@/constants/theme';

// Firebase push notifications — fails gracefully in Expo Go
let registerForPushNotifications: (() => Promise<string | null>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ns = require('@/services/notificationService');
  registerForPushNotifications = ns.registerForPushNotifications;
} catch {
  // Firebase not available
}

/**
 * Sign in — the web's LoginForm at phone width.
 *
 * Copy is the site's, including the header ("Welcome Back" / "Sign in to your
 * account to continue shopping and track your orders") and the divider's "Or
 * continue with", which mobile had shortened to "OR".
 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Matches the web's LoginForm: the box decides whether the session survives
  // a restart, so it defaults to off rather than silently opting everyone in.
  const [rememberMe, setRememberMe] = useState(false);
  // Set when the server answers a password login with GOOGLE_ACCOUNT — the
  // credentials aren't wrong, the account simply has no password to check.
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const {
    available: GOOGLE_SIGNIN_AVAILABLE,
    loading: googleLoading,
    signIn: handleGoogleSignIn,
  } = useGoogleAuth();

  const { refreshCart } = useCart();
  const { refreshWishlist } = useWishlist();

  // Trigger context refresh after a successful login so guest cart/wishlist
  // items migrate to the server copy before navigation.
  const hydrateAfterLogin = async () => {
    await Promise.all([refreshCart(), refreshWishlist()]);
  };

  const validateEmail = useCallback((value: string) => {
    if (!value) {
      setEmailError('Please enter your email address');
      return false;
    }
    if (!EMAIL_RE.test(value)) {
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
    // 8, matching the web's LoginForm and the 8 that Register enforces on both
    // clients. Mobile previously accepted 6 here, so a password this app would
    // refuse to create was still allowed through its own sign-in form.
    if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
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
      // Put the cursor on the field that failed rather than leaving the user
      // to find it — the same reason Register does this.
      if (!isPasswordValid && isEmailValid) passwordRef.current?.focus();
      return;
    }

    setGoogleAccountEmail(null);

    try {
      setSubmitting(true);

      const response = await userAuthService.login({
        email: normalizedEmail,
        password: password.trim(),
      });

      if (response.success && response.data) {
        await userAuthService.storeAuthData(response.data.token, response.data.user, rememberMe);
        await hydrateAfterLogin();
        registerForPushNotifications?.().catch(() => {});
        showSuccessToast('Welcome Back!', `Logged in as ${response.data.user.name}`);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      // A Google-created account has no password to check, so "invalid
      // credentials" is the wrong answer — it sends the user off to reset a
      // password that does not exist. The web surfaces this as its own panel;
      // so does this screen.
      const errorCode = error?.data?.code;
      if (errorCode === 'GOOGLE_ACCOUNT') {
        setGoogleAccountEmail(normalizedEmail);
        showErrorToast(
          'Google Account',
          'This account was created with Google sign-in. Please use the Google button to log in.',
        );
        return;
      }

      console.error('Login error:', error);
      showErrorToast('Login Failed', error.message || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, rememberMe, validateEmail, validatePassword]);

  return (
    <AuthShell
      mode="login"
      title="Welcome Back"
      subtitle="Sign in to your account to continue shopping and track your orders"
      footer={
        <AuthSwitch
          prompt="Don't have an account?"
          action="Create one"
          onPress={() => router.replace('/(auth)/Register')}
        />
      }
    >
      {/* Google Account Notice — the web's blue panel, shown only after the
          server tells us this address is a Google account. */}
      {googleAccountEmail ? (
        <View
          style={{
            backgroundColor: '#eff6ff',
            borderWidth: 1,
            borderColor: '#bfdbfe',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          <AlertCircle size={18} color="#3b82f6" strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Fonts.sansSemibold, fontSize: 13, fontWeight: '600', color: '#1e40af' }}>
              Google Account Detected
            </Text>
            <Text style={{ fontFamily: Fonts.sans, fontSize: 12, lineHeight: 18, color: '#1d4ed8', marginTop: 4 }}>
              The account {googleAccountEmail} was created using Google sign-in. Please
              continue with Google to log in.
            </Text>
            {GOOGLE_SIGNIN_AVAILABLE ? (
              <View style={{ marginTop: 10 }}>
                <GoogleButton compact busy={googleLoading} onPress={handleGoogleSignIn} />
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setGoogleAccountEmail(null)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <X size={16} color="#60a5fa" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      ) : null}

      <AuthField
        label="Email Address"
        value={email}
        onChangeText={(v) => {
          setEmail(v.toLowerCase());
          if (emailError) setEmailError('');
          // The notice belongs to the address that triggered it.
          if (googleAccountEmail) setGoogleAccountEmail(null);
        }}
        onBlur={() => validateEmail(email.trim().toLowerCase())}
        placeholder="Enter your email address"
        error={emailError}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />

      <AuthField
        ref={passwordRef}
        label="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (passwordError) setPasswordError('');
        }}
        onBlur={() => validatePassword(password)}
        placeholder="Enter your password"
        error={passwordError}
        secure
        autoCapitalize="none"
        textContentType="password"
        autoComplete="current-password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      {/* Remember me + Forgot password — one row, as on the web. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <AuthCheckbox
          checked={rememberMe}
          onToggle={() => setRememberMe((v) => !v)}
          label="Remember me"
        />
        <TouchableOpacity
          onPress={() => router.push('/(auth)/ForgotPassword')}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Forgot your password"
        >
          <Text style={{ fontFamily: Fonts.sansMedium, fontSize: 12, fontWeight: '500', color: '#e01a1b' }}>
            Forgot password?
          </Text>
        </TouchableOpacity>
      </View>

      <AuthButton
        label="Sign In"
        busyLabel="Signing in..."
        busy={submitting}
        onPress={handleSubmit}
      />

      {GOOGLE_SIGNIN_AVAILABLE ? (
        <>
          <AuthDivider label="Or continue with" />
          <GoogleButton busy={googleLoading} onPress={handleGoogleSignIn} />
        </>
      ) : null}
    </AuthShell>
  );
}

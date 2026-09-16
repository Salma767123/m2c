import { useCallback, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

/**
 * Shared Google sign-in for the auth screens.
 *
 * The web keeps one `handleGoogleAuth` in LoginRegister.tsx and hands the same
 * function to both LoginForm and RegisterForm, so the two tabs can never drift.
 * Mobile had the whole flow inlined in Login.tsx and nothing at all in
 * Register.tsx — meaning you could sign IN with Google but not sign UP. This
 * hook is that single shared implementation.
 *
 * Google is an identity provider, not two different operations: the same call
 * signs an existing user in and creates an account for a new one, which is why
 * both screens can share one path.
 */

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

// Expo Go can't load native modules. Lazy-require so the app still boots there;
// Google Sign-In is disabled in Expo Go and works only in dev-client / release builds.
const IS_EXPO_GO = Constants.appOwnership === 'expo';
let GoogleSignin: any = null;
let isSuccessResponse: ((r: any) => boolean) | null = null;
let isErrorWithCode: ((e: any) => boolean) | null = null;
let statusCodes: any = null;
if (!IS_EXPO_GO) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    isSuccessResponse = mod.isSuccessResponse;
    isErrorWithCode = mod.isErrorWithCode;
    statusCodes = mod.statusCodes;
  } catch {
    // Module not installed in this binary — Google Sign-In stays hidden.
  }
}

export const GOOGLE_SIGNIN_AVAILABLE = !!GoogleSignin;

// Firebase push registration — absent in Expo Go, and never fatal.
let registerForPushNotifications: (() => Promise<string | null>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ns = require('@/services/notificationService');
  registerForPushNotifications = ns.registerForPushNotifications;
} catch {
  // Firebase not available
}

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const { refreshCart } = useCart();
  const { refreshWishlist } = useWishlist();

  useEffect(() => {
    if (GOOGLE_SIGNIN_AVAILABLE) {
      GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_ID });
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!GOOGLE_SIGNIN_AVAILABLE) {
      showErrorToast(
        'Unavailable in Expo Go',
        'Google Sign-In needs a dev build. Use email/password or run with a dev client.',
      );
      return;
    }

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse!(response)) {
        const { user } = response.data;

        const result = await userAuthService.googleLogin({
          googleId: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          image: user.photo || undefined,
        });

        if (result.success && result.data) {
          // Google sessions are always persistent — there is no "remember me"
          // decision to make when the identity lives in the Google account.
          await userAuthService.storeAuthData(result.data.token, result.data.user, true);
          // Migrate the guest cart/wishlist to the server copy before we navigate.
          await Promise.all([refreshCart(), refreshWishlist()]);
          registerForPushNotifications?.().catch(() => {});
          showSuccessToast('Welcome!', `Signed in as ${result.data.user.name}`);
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      if (isErrorWithCode!(error)) {
        // Cancelling or double-tapping is a decision, not a failure — say nothing.
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) return;
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          showErrorToast('Error', 'Google Play Services not available.');
          return;
        }
      }
      console.error('Google sign-in error:', error);
      showErrorToast('Sign-In Failed', error?.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }, [refreshCart, refreshWishlist]);

  return { available: GOOGLE_SIGNIN_AVAILABLE, loading, signIn };
}

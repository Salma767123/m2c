import React, { useCallback, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { userAuthService } from '@/services/userAuthService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { useGoogleAuth } from '@/lib/googleAuth';
import {
  AuthShell,
  AuthField,
  AuthRow,
  AuthButton,
  AuthCheckbox,
  AuthDivider,
  AuthSwitch,
  GoogleButton,
  StrengthMeter,
  EMAIL_RE,
} from '@/components/WebSite/Auth/AuthKit';
import { Fonts } from '@/constants/theme';

/**
 * Account creation — the web's RegisterForm at phone width.
 *
 * Mirrors the site field-for-field (first/last name, email, phone, password +
 * confirm, terms) and posts the same payload: `name` is the two name fields
 * joined, which is what the backend expects.
 *
 * On success the backend emails a verification link; the user cannot sign in
 * until they follow it, so we route back to Login with that message rather than
 * storing a token here.
 */
export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Same shared flow the Login screen uses. Google is one identity operation:
  // the call signs an existing user in and creates the account for a new one.
  const {
    available: googleAvailable,
    loading: googleLoading,
    signIn: handleGoogleSignUp,
  } = useGoogleAuth();

  const setError = (key: string, message: string) =>
    setErrors((prev) => ({ ...prev, [key]: message }));

  const clearError = (key: string) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  const validate = useCallback(() => {
    const next: Record<string, string> = {};

    if (!firstName.trim()) next.firstName = 'Enter your first name';
    if (!lastName.trim()) next.lastName = 'Enter your last name';

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) next.email = 'Please enter your email address';
    else if (!EMAIL_RE.test(normalizedEmail)) next.email = 'Please enter a valid email address';

    // Digits only, 10–15 — wide enough for international numbers without
    // pulling libphonenumber into this screen.
    const digits = phone.replace(/\D/g, '');
    if (!digits) next.phone = 'Please enter your phone number';
    else if (digits.length < 10 || digits.length > 15) next.phone = 'Please enter a valid phone number';

    if (!password) next.password = 'Please create a password';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters';

    if (!confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match';

    setErrors(next);
    // Returns the map, not a boolean: the caller needs to know WHICH field
    // failed so it can focus it.
    return next;
  }, [firstName, lastName, email, phone, password, confirmPassword]);

  /**
   * Focus the first field that failed.
   *
   * This form is six fields deep, so on a phone the field that failed is often
   * scrolled off screen when the toast appears — leaving "fix the highlighted
   * fields" pointing at something the user cannot see. Focusing it makes
   * KeyboardAwareScrollView bring it into view, and puts the cursor where the
   * work is.
   */
  const focusFirstError = (errs: Record<string, string>) => {
    const order: [string, React.RefObject<TextInput | null> | null][] = [
      ['firstName', null], // already at the top of the form
      ['lastName', lastNameRef],
      ['email', emailRef],
      ['phone', phoneRef],
      ['password', passwordRef],
      ['confirmPassword', confirmRef],
    ];
    for (const [key, ref] of order) {
      if (errs[key]) {
        ref?.current?.focus();
        return;
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      showErrorToast('Check your details', 'Please fix the highlighted fields and try again.');
      focusFirstError(errs);
      return;
    }
    if (!agreed) {
      showErrorToast('Terms Required', 'Please agree to the terms and conditions.');
      return;
    }

    try {
      setSubmitting(true);
      const response = await userAuthService.register({
        email: email.trim().toLowerCase(),
        password,
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        phoneNumber: phone.trim(),
      });

      if (response.success) {
        showSuccessToast('Account Created', 'Check your email to verify your account, then sign in.');
        router.replace('/(auth)/Login');
      } else {
        showErrorToast('Registration Failed', response.message || 'Something went wrong.');
      }
    } catch (error: any) {
      showErrorToast(
        'Registration Failed',
        error?.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [validate, agreed, email, password, firstName, lastName, phone]);

  return (
    <AuthShell
      mode="register"
      title="Join Our Community"
      subtitle="Create your account to start shopping and enjoy exclusive member benefits"
      footer={
        <AuthSwitch
          prompt="Already have an account?"
          action="Sign in"
          onPress={() => router.replace('/(auth)/Login')}
        />
      }
    >
      <AuthRow>
        <AuthField
          compact
          label="First Name"
          value={firstName}
          onChangeText={(v) => {
            setFirstName(v);
            clearError('firstName');
          }}
          onBlur={() => !firstName.trim() && setError('firstName', 'Enter your first name')}
          placeholder="First name"
          error={errors.firstName}
          autoCapitalize="words"
          textContentType="givenName"
          autoComplete="given-name"
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
          submitBehavior="submit"
        />
        <AuthField
          compact
          ref={lastNameRef}
          label="Last Name"
          value={lastName}
          onChangeText={(v) => {
            setLastName(v);
            clearError('lastName');
          }}
          onBlur={() => !lastName.trim() && setError('lastName', 'Enter your last name')}
          placeholder="Last name"
          error={errors.lastName}
          autoCapitalize="words"
          textContentType="familyName"
          autoComplete="family-name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          submitBehavior="submit"
        />
      </AuthRow>

      <AuthField
        ref={emailRef}
        label="Email Address"
        value={email}
        onChangeText={(v) => {
          setEmail(v.toLowerCase());
          clearError('email');
        }}
        placeholder="Enter your email address"
        error={errors.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        submitBehavior="submit"
      />

      <AuthField
        ref={phoneRef}
        label="Phone Number"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          clearError('phone');
        }}
        placeholder="Enter your phone number"
        error={errors.phone}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />

      <View>
        <AuthField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clearError('password');
          }}
          placeholder="Create a password"
          error={errors.password}
          secure
          autoCapitalize="none"
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          submitBehavior="submit"
        />
        {!errors.password ? (
          <View style={{ marginTop: -10, marginBottom: 12 }}>
            <StrengthMeter value={password} />
          </View>
        ) : null}
      </View>

      <AuthField
        ref={confirmRef}
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          clearError('confirmPassword');
        }}
        placeholder="Confirm your password"
        error={errors.confirmPassword}
        secure
        autoCapitalize="none"
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />

      {/* Terms */}
      <View style={{ marginBottom: 20 }}>
        <AuthCheckbox
          align="start"
          checked={agreed}
          onToggle={() => setAgreed((a) => !a)}
          label="Agree to terms and conditions"
        >
          <Text style={{ fontFamily: Fonts.sans, flex: 1, fontSize: 12, lineHeight: 18, color: '#374151' }}>
            I agree to the{' '}
            <Text
              style={{ fontFamily: Fonts.sansSemibold, fontWeight: '600', color: '#e01a1b' }}
              onPress={() => router.push('/(any)/terms')}
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={{ fontFamily: Fonts.sansSemibold, fontWeight: '600', color: '#e01a1b' }}
              onPress={() => router.push('/(any)/privacy')}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </AuthCheckbox>
      </View>

      <AuthButton
        label="Create Account"
        busyLabel="Creating account..."
        busy={submitting}
        onPress={handleSubmit}
      />

      {googleAvailable ? (
        <>
          <AuthDivider label="Or continue with" />
          <GoogleButton busy={googleLoading} onPress={handleGoogleSignUp} />
        </>
      ) : null}
    </AuthShell>
  );
}

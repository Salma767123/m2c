// Deep-link alias for the password-reset screen.
//
// Expo Router strips group segments from URLs, so the screen inside (auth)
// is not addressable as "/(auth)/ResetPassword" from outside the app. This
// top-level route gives the deep link a stable target:
//
//   mobile://reset-password?token=…
//
// The token is forwarded straight through by useLocalSearchParams inside the
// screen, so nothing needs to be threaded here.

export { default } from './(auth)/ResetPassword';

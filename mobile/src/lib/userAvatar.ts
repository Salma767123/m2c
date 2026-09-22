/**
 * The signed-in customer's photo and name, shared by every surface that shows
 * them: the drawer's account card and the Profile tab.
 *
 * Both used to draw a glyph because neither had anywhere to read a photo from.
 * Profile.tsx already wrote a new photo back into the stored session — its
 * comment says "so the sidebar avatar" picks it up — but nothing ever read it,
 * so the write went nowhere.
 *
 * A store rather than a hook-per-screen for two reasons. The Profile tab lives
 * in the tab bar, which stays mounted for the app's whole life, so it cannot
 * learn about a new photo by remounting. And two surfaces reading AsyncStorage
 * independently would drift: change the photo and the drawer would show the new
 * one while the tab kept the old until something happened to reload it.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserAvatar = {
  /** Absolute URL or data: URI. Empty when the account has no photo. */
  image: string;
  name: string;
  email: string;
  isAuth: boolean;
};

const EMPTY: UserAvatar = { image: '', name: '', email: '', isAuth: false };

let current: UserAvatar = EMPTY;
let loaded = false;
const listeners = new Set<(v: UserAvatar) => void>();

function emit() {
  listeners.forEach((l) => l(current));
}

/** Re-reads the stored session. Called on sign-in, sign-out and first use. */
export async function refreshUserAvatar(): Promise<void> {
  try {
    const [token, raw] = await Promise.all([
      AsyncStorage.getItem('userToken'),
      AsyncStorage.getItem('userData'),
    ]);
    const u = raw ? JSON.parse(raw) : null;
    current = {
      image: u?.image || '',
      name: u?.name || '',
      email: u?.email || '',
      isAuth: !!token,
    };
  } catch {
    // A storage failure should show the glyph, not crash the bar that draws it.
    current = EMPTY;
  }
  loaded = true;
  emit();
}

/** Called when the customer picks a new photo, so both surfaces change at once
 *  instead of waiting for the next read of storage. */
export function setUserAvatarImage(image: string): void {
  current = { ...current, image: image || '' };
  emit();
}

/** Two letters from the name, the fallback when there is no photo. */
export function avatarInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function useUserAvatar(): UserAvatar {
  const [value, setValue] = useState<UserAvatar>(current);

  useEffect(() => {
    listeners.add(setValue);
    if (loaded) setValue(current);
    else void refreshUserAvatar();
    return () => {
      listeners.delete(setValue);
    };
  }, []);

  return value;
}

// Scroll-to-first-error plumbing for the Product Inspection form.
//
// RN equivalent of the web portal's approach
// (frontend/src/components/Checker/Products/ProductInspectionForm.tsx): there,
// a step marks its offending element with data-invalid="true" and the form does
// querySelector + scrollIntoView({ block: 'center' }) + a red ring for 2.2s.
//
// There is no DOM to query here, so steps instead wrap the offending field in
// <InvalidAnchor errorKey=… invalid />, which registers its host node with the
// form. On a failed Next the form looks the node up by error key, scrolls the
// step's ScrollView to it, and flashes the same red ring.
//
// Only invalid fields register — the direct analogue of data-invalid — so the
// lookup is "give me the node for this error", not "search everything".

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';

type Registry = Map<string, Map<string, any>>;

type PIValidationValue = {
  /** Register (node) or drop (null) this instance's node under an error key. */
  register: (errorKey: string, instanceId: string, node: any | null) => void;
  /** Error key currently being flashed, if any. */
  flashKey: string | null;
};

const PIValidationContext = createContext<PIValidationValue>({
  register: () => {},
  flashKey: null,
});

/** Ring timing copied from the web so both platforms feel the same. */
export const FLASH_MS = 2200;
const FLASH_FADE_MS = 250;

export function PIValidationProvider({
  register,
  flashKey,
  children,
}: PIValidationValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({ register, flashKey }), [register, flashKey]);
  return <PIValidationContext.Provider value={value}>{children}</PIValidationContext.Provider>;
}

/**
 * Form-side registry. Nodes are stored per error key in mount order, so
 * `getNode` hands back the first offending field on screen — matching
 * querySelector, which returns the first match in document order.
 */
export function useInvalidFieldRegistry() {
  const registryRef = useRef<Registry>(new Map());
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const register = useCallback((errorKey: string, instanceId: string, node: any | null) => {
    const registry = registryRef.current;
    if (node) {
      let bucket = registry.get(errorKey);
      if (!bucket) {
        bucket = new Map();
        registry.set(errorKey, bucket);
      }
      bucket.set(instanceId, node);
      return;
    }
    const bucket = registry.get(errorKey);
    if (!bucket) return;
    bucket.delete(instanceId);
    if (bucket.size === 0) registry.delete(errorKey);
  }, []);

  const getNode = useCallback((errorKey: string) => {
    const bucket = registryRef.current.get(errorKey);
    if (!bucket) return null;
    // Map preserves insertion order, and effects run in mount order.
    for (const node of bucket.values()) return node;
    return null;
  }, []);

  const flash = useCallback((errorKey: string | null) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashKey(errorKey);
    if (!errorKey) return;
    flashTimer.current = setTimeout(() => setFlashKey(null), FLASH_MS + FLASH_FADE_MS);
  }, []);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  return { register, getNode, flash, flashKey };
}

/**
 * Wraps a mandatory field. When `invalid`, it registers itself as the scroll
 * target for `errorKey` and shows a red ring while the form is flashing it.
 *
 * The border is always present but transparent, so turning it red cannot nudge
 * the layout.
 */
export function InvalidAnchor({
  errorKey,
  invalid,
  children,
  style,
  radius = 14,
}: {
  errorKey: string;
  invalid: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const { register, flashKey } = useContext(PIValidationContext);
  const instanceId = useId();
  const ref = useRef<View>(null);

  useEffect(() => {
    if (!invalid) return;
    register(errorKey, instanceId, ref.current);
    return () => register(errorKey, instanceId, null);
  }, [errorKey, instanceId, invalid, register]);

  const flashing = invalid && flashKey === errorKey;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flashing) {
      anim.setValue(0);
      return;
    }
    anim.setValue(1);
    const timer = setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: FLASH_FADE_MS,
        // Border/background colours are not native-driver animatable.
        useNativeDriver: false,
      }).start();
    }, FLASH_MS);
    return () => clearTimeout(timer);
  }, [flashing, anim]);

  return (
    <Animated.View
      ref={ref}
      collapsable={false}
      style={[
        {
          borderWidth: 2,
          borderRadius: radius,
          borderColor: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(239,68,68,0)', 'rgba(239,68,68,1)'],
          }),
          backgroundColor: anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(254,226,226,0)', 'rgba(254,226,226,0.55)'],
          }),
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

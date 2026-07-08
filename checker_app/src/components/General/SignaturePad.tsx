// Drawn-signature pad for the checker app.
//
// Mirrors the web QC portal's signature capture (react-signature-canvas in
// frontend/src/components/Checker/Vendor/Steps/Documentation.tsx) which stores
// the signature as a PNG data URL via sigPad.toDataURL('image/png'). Here we
// draw strokes with PanResponder + react-native-svg and export the pad through
// react-native-view-shot as a base64 PNG data URI, so the stored value has the
// exact same `data:image/png;base64,...` format the backend/PDF already expect.

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { Eraser, PenLine } from 'lucide-react-native';

export interface SignaturePadProps {
  /** Existing signature as a PNG data URI — shown as an image until redrawn */
  value?: string | null;
  /** Fires with a `data:image/png;base64,...` URI after each stroke, or null on clear */
  onChange: (dataUrl: string | null) => void;
  /** Drawing area height in px (default 180) */
  height?: number;
  /** Optional label rendered above the pad */
  label?: string;
}

export default function SignaturePad({
  value,
  onChange,
  height = 180,
  label,
}: SignaturePadProps) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  // When a saved signature exists, the pad shows it as an image until the
  // user explicitly chooses to redo it.
  const [redoing, setRedoing] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);
  const currentPathRef = useRef('');
  const pendingCaptureRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture even if a parent (e.g. ScrollView) asks for it
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        // Tiny L segment so a single tap still leaves a visible dot
        currentPathRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrentPath(currentPathRef.current);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPathRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrentPath(currentPathRef.current);
      },
      onPanResponderRelease: () => finishStroke(),
      onPanResponderTerminate: () => finishStroke(),
    })
  ).current;

  const finishStroke = () => {
    if (!currentPathRef.current) return;
    const finished = currentPathRef.current;
    currentPathRef.current = '';
    pendingCaptureRef.current = true;
    setCurrentPath(null);
    setStrokes((prev) => [...prev, finished]);
  };

  // Capture AFTER the finished stroke has been committed to the SVG, so the
  // exported PNG always includes it.
  useEffect(() => {
    if (!pendingCaptureRef.current || strokes.length === 0) return;
    pendingCaptureRef.current = false;
    const raf = requestAnimationFrame(async () => {
      try {
        const dataUri = await viewShotRef.current?.capture?.();
        if (dataUri) onChange(dataUri);
      } catch (error) {
        console.error('SignaturePad: failed to capture signature:', error);
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  const handleClear = () => {
    currentPathRef.current = '';
    pendingCaptureRef.current = false;
    setStrokes([]);
    setCurrentPath(null);
    onChange(null);
  };

  const handleRedo = () => {
    setRedoing(true);
    setStrokes([]);
    setCurrentPath(null);
    onChange(null);
  };

  const showExisting = !!value && strokes.length === 0 && !currentPath && !redoing;
  const hasDrawing = strokes.length > 0 || !!currentPath;

  return (
    <View>
      {!!label && (
        <Text className="mb-2 text-sm font-semibold text-slate-700">{label}</Text>
      )}

      {showExisting ? (
        // Existing signature preview + redo option
        <View>
          <View
            className="items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white"
            style={{ height }}
          >
            <Image
              source={{ uri: value as string }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            onPress={handleRedo}
            activeOpacity={0.8}
            className="mt-2 flex-row items-center justify-center self-start rounded-lg bg-blue-50 px-3 py-2"
          >
            <PenLine size={14} color="#2563eb" />
            <Text className="ml-1.5 text-xs font-semibold text-blue-600">Redo signature</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Drawing pad
        <View>
          <View className="overflow-hidden rounded-xl border border-slate-300 bg-white">
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1, result: 'data-uri' }}
              style={{ height, backgroundColor: '#ffffff' }}
            >
              <View
                style={{ flex: 1 }}
                {...panResponder.panHandlers}
                collapsable={false}
              >
                <Svg width="100%" height="100%">
                  {strokes.map((d, i) => (
                    <Path
                      key={`s-${i}`}
                      d={d}
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                  {currentPath ? (
                    <Path
                      d={currentPath}
                      stroke="#0f172a"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ) : null}
                </Svg>
                {!hasDrawing && (
                  <View
                    pointerEvents="none"
                    className="absolute inset-0 items-center justify-center"
                  >
                    <Text className="text-sm text-slate-400">
                      Sign here using your finger or stylus
                    </Text>
                  </View>
                )}
              </View>
            </ViewShot>
          </View>

          <TouchableOpacity
            onPress={handleClear}
            activeOpacity={0.8}
            className="mt-2 flex-row items-center justify-center self-start rounded-lg bg-slate-100 px-3 py-2"
          >
            <Eraser size={14} color="#475569" />
            <Text className="ml-1.5 text-xs font-semibold text-slate-600">Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

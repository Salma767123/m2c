// Drawn-signature pad for the checker app.
//
// Mirrors the web QC portal's signature capture (react-signature-canvas in
// frontend/src/components/Checker/Vendor/Steps/Documentation.tsx) which stores
// the signature as a PNG data URL via sigPad.toDataURL('image/png'). Here we
// draw strokes with PanResponder + react-native-svg and export the pad through
// react-native-view-shot as a base64 PNG data URI, so the stored value has the
// exact same `data:image/png;base64,...` format the backend/PDF already expect.
//
// The pad is portrait-oriented: `fill` lets it grow to whatever height its
// parent gives it, so the Signature Center can hand it a full sheet instead of
// the old short landscape strip.
//
// The export is cropped to the ink's bounding box. That keeps the stored PNG
// independent of the pad's shape — the report embeds it under
// `max-width:240px; max-height:110px` (piReportHtml.ts), so exporting a tall
// mostly-empty canvas would scale the actual signature down to a fraction of
// its readable size.

import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Image, PanResponder } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Eraser, PenLine } from 'lucide-react-native';
import { AppText } from '@/components/UI/AppText';
import { brand, colors } from '@/constants/design';

/** White space kept around the signature when cropping the export, in dp. */
const INK_PADDING = 14;

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type Size = { w: number; h: number };

/** ViewShot hands back a bare path on some platforms — Image/manipulate want a URI. */
function toFileUri(path: string): string {
  return path.startsWith('file://') || path.includes('://') ? path : `file://${path}`;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

/**
 * Trim the captured pad down to the drawn ink (plus a little breathing room)
 * and return it as a PNG data URI. Falls back to the untrimmed capture whenever
 * the bounds or the image size are unavailable, so a failed measurement costs
 * framing rather than the signature itself.
 */
async function cropToInk(fileUri: string, bounds: Bounds | null, pad: Size): Promise<string> {
  const actions: Parameters<typeof manipulateAsync>[1] = [];

  if (bounds && pad.w > 0 && pad.h > 0) {
    const size = await getImageSize(fileUri).catch(() => null);
    if (size && size.width > 0) {
      // The capture is at native pixel density; convert dp bounds to pixels.
      const scale = size.width / pad.w;
      const left = Math.max(0, Math.round((bounds.minX - INK_PADDING) * scale));
      const top = Math.max(0, Math.round((bounds.minY - INK_PADDING) * scale));
      const right = Math.min(size.width, Math.round((bounds.maxX + INK_PADDING) * scale));
      const bottom = Math.min(size.height, Math.round((bounds.maxY + INK_PADDING) * scale));
      const width = right - left;
      const height = bottom - top;
      if (width >= 1 && height >= 1) {
        actions.push({ crop: { originX: left, originY: top, width, height } });
      }
    }
  }

  const out = await manipulateAsync(fileUri, actions, { format: SaveFormat.PNG, base64: true });
  if (!out.base64) throw new Error('Signature capture produced no image data');
  return `data:image/png;base64,${out.base64}`;
}

export interface SignaturePadProps {
  /** Existing signature as a PNG data URI — shown as an image until redrawn */
  value?: string | null;
  /** Fires with a `data:image/png;base64,...` URI after each stroke, or null on clear */
  onChange: (dataUrl: string | null) => void;
  /** Drawing area height in px (default 180). Ignored when `fill` is set. */
  height?: number;
  /** Grow to fill the parent instead of using a fixed height — the portrait sheet. */
  fill?: boolean;
  /** Optional label rendered above the pad */
  label?: string;
}

export default function SignaturePad({
  value,
  onChange,
  height = 180,
  fill = false,
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
  const boundsRef = useRef<Bounds | null>(null);
  const padSizeRef = useRef<Size>({ w: 0, h: 0 });
  // Capture is async (screenshot → crop → encode), so two quick strokes can be
  // in flight at once. Only the newest result may reach onChange, otherwise a
  // slow earlier capture could overwrite the signature with a stale version.
  const captureSeqRef = useRef(0);

  const noteBounds = (x: number, y: number) => {
    const b = boundsRef.current;
    boundsRef.current = b
      ? {
          minX: Math.min(b.minX, x),
          minY: Math.min(b.minY, y),
          maxX: Math.max(b.maxX, x),
          maxY: Math.max(b.maxY, y),
        }
      : { minX: x, minY: y, maxX: x, maxY: y };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the gesture even if a parent (e.g. ScrollView) asks for it
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        noteBounds(locationX, locationY);
        // Tiny L segment so a single tap still leaves a visible dot
        currentPathRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setCurrentPath(currentPathRef.current);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        noteBounds(locationX, locationY);
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
    const seq = ++captureSeqRef.current;
    const raf = requestAnimationFrame(async () => {
      let captured: string | undefined;
      try {
        captured = await viewShotRef.current?.capture?.();
        if (!captured) return;
        const fileUri = toFileUri(captured);
        const dataUrl = await cropToInk(fileUri, boundsRef.current, padSizeRef.current);
        if (seq === captureSeqRef.current) onChange(dataUrl);
      } catch (error) {
        console.error('SignaturePad: failed to capture signature:', error);
      } finally {
        if (captured) {
          FileSystem.deleteAsync(toFileUri(captured), { idempotent: true }).catch(() => {});
        }
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  const reset = () => {
    currentPathRef.current = '';
    pendingCaptureRef.current = false;
    boundsRef.current = null;
    // Invalidate any capture still in flight so it cannot resurrect the
    // signature the checker just cleared.
    captureSeqRef.current += 1;
    setStrokes([]);
    setCurrentPath(null);
    onChange(null);
  };

  const handleClear = () => reset();

  const handleRedo = () => {
    setRedoing(true);
    reset();
  };

  const showExisting = !!value && strokes.length === 0 && !currentPath && !redoing;
  const hasDrawing = strokes.length > 0 || !!currentPath;

  return (
    <View style={fill ? { flex: 1 } : undefined}>
      {!!label && (
        <AppText variant="titleMd" color={colors.textSecondary} style={{ marginBottom: 8 }}>
          {label}
        </AppText>
      )}

      {showExisting ? (
        // Existing signature preview + redo option. The stored PNG is cropped to
        // the ink, so a fixed, modest box frames it better than a full sheet.
        <View>
          <View
            className="items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white"
            style={{ height: 160 }}
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
            className="mt-2 flex-row items-center justify-center self-start rounded-lg bg-brand-50 px-3 py-2"
          >
            <PenLine size={14} color={brand[500]} />
            <AppText variant="labelMd" color={brand[600]} style={{ marginLeft: 6 }}>Redo signature</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        // Drawing pad
        <View style={fill ? { flex: 1 } : undefined}>
          <View
            className="overflow-hidden rounded-xl border border-slate-300 bg-white"
            style={fill ? { flex: 1 } : undefined}
          >
            {/* Only the ink lives inside ViewShot — the guides below are drawn
                over it, never into the exported PNG. Touches and onLayout sit on
                the captured surface itself, so stroke coordinates, the exported
                pixels and the crop maths all share one origin. */}
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1, result: 'tmpfile' }}
              style={fill ? { flex: 1, backgroundColor: '#ffffff' } : { height, backgroundColor: '#ffffff' }}
            >
              <View
                style={{ flex: 1 }}
                onLayout={(e) => {
                  const { width, height: h } = e.nativeEvent.layout;
                  padSizeRef.current = { w: width, h };
                }}
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
              </View>
            </ViewShot>

            {/* Signing guide. A tall pad needs to say where the signature goes,
                otherwise the checker has no reason to prefer one band of empty
                space over another. */}
            <View pointerEvents="none" className="absolute inset-0 justify-end pb-[22%] px-6">
              <View className="flex-row items-end" style={{ columnGap: 8 }}>
                <AppText variant="titleMd" color={colors.textFaint}>✕</AppText>
                <View className="flex-1 border-b border-slate-300" style={{ marginBottom: 4 }} />
              </View>
              {!hasDrawing && (
                <AppText variant="bodyMd" color={colors.textFaint} style={{ marginTop: 8 }}>
                  Sign above the line using your finger or stylus
                </AppText>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleClear}
            activeOpacity={0.8}
            className="mt-2 flex-row items-center justify-center self-start rounded-lg bg-slate-100 px-3 py-2"
          >
            <Eraser size={14} color="#475569" />
            <AppText variant="labelMd" color={colors.textSecondary} style={{ marginLeft: 6 }}>Clear</AppText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Image compression util for the checker app.
//
// Mirrors the web QC portal's compressImage helper (e.g.
// frontend/src/components/Checker/Vendor/Steps/Documentation.tsx): resize to a
// max width of 1200px preserving aspect ratio, encode as JPEG at 0.7 quality,
// and return a `data:image/jpeg;base64,...` data URI — so payloads produced by
// the app are byte-format-compatible with what the backend already receives
// from the web portal.

import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const MAX_WIDTH = 1200; // same as web compressImage(file, maxWidth = 1200, ...)
const JPEG_QUALITY = 0.7; // same as web (..., quality = 0.7)

/** Resolve an image's intrinsic width (works for file://, content:// and data: URIs). */
function getImageWidth(uri: string): Promise<number> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width) => resolve(width),
      (error) => reject(error),
    );
  });
}

/**
 * Resize a local image to max 1200px wide (never upscales, aspect preserved)
 * and compress to JPEG at 0.7 quality. Returns a base64 data URI
 * (`data:image/jpeg;base64,...`).
 */
export async function compressImage(uri: string): Promise<string> {
  // Only downscale — the web helper leaves smaller images at their own size.
  const width = await getImageWidth(uri).catch(() => null);
  const actions = width && width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];

  const result = await manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) {
    throw new Error('Image compression failed: no base64 output');
  }
  return `data:image/jpeg;base64,${result.base64}`;
}

/**
 * Compress an image that is already a base64 data URI. The data URI is written
 * to a cache file first (ImageManipulator handles file URIs reliably on every
 * platform), compressed, then the temp file is cleaned up.
 */
export async function compressDataUri(dataUri: string): Promise<string> {
  const match = dataUri.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('compressDataUri expects a base64 image data URI');
  }
  const [, ext, base64] = match;

  const tempPath = `${FileSystem.cacheDirectory}img-compress-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
  await FileSystem.writeAsStringAsync(tempPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  try {
    return await compressImage(tempPath);
  } finally {
    // Best-effort cleanup of the temp file
    FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => {});
  }
}

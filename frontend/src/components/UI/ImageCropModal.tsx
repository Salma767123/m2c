"use client";

import * as React from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, X, Check, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Square (1:1) image crop modal for profile photos. The selected file is NOT
// uploaded directly — the user crops/zooms/rotates and confirms, and we hand
// back a compressed square image (JPEG, 500×500, ~≤1 MB).
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_SIZE = 500; // px (square)
const OUTPUT_TYPE = "image/jpeg";
const MAX_OUTPUT_BYTES = 1024 * 1024; // ~1 MB target

/** Load an object-URL / data-URL into an HTMLImageElement. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.src = src;
  });
}

/**
 * Render the chosen crop region to a square canvas at OUTPUT_SIZE, applying the
 * rotation, then export as a compressed JPEG. Iteratively lowers quality until
 * the result is under the size target.
 */
async function getCroppedFile(
  imageSrc: string,
  cropPixels: Area,
  rotation: number,
  fileName: string,
  aspect: number = 1
): Promise<File> {
  const image = await loadImage(imageSrc);

  // First draw the (possibly rotated) source onto a working canvas so the crop
  // rectangle maps to upright pixels.
  const rad = (rotation * Math.PI) / 180;
  const swap = rotation === 90 || rotation === 270;
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;

  const work = document.createElement("canvas");
  work.width = swap ? srcH : srcW;
  work.height = swap ? srcW : srcH;
  const wctx = work.getContext("2d")!;
  wctx.translate(work.width / 2, work.height / 2);
  wctx.rotate(rad);
  wctx.drawImage(image, -srcW / 2, -srcH / 2);

  // Crop the requested region into an output canvas sized to the crop aspect
  // (square by default; wide for a logo). Longest side capped at OUTPUT_SIZE.
  const out = document.createElement("canvas");
  const outW = aspect >= 1 ? OUTPUT_SIZE : Math.round(OUTPUT_SIZE * aspect);
  const outH = aspect >= 1 ? Math.round(OUTPUT_SIZE / aspect) : OUTPUT_SIZE;
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  // JPEG has no alpha — paint white first so transparent logos don't turn black.
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, outW, outH);
  octx.drawImage(
    work,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outW,
    outH
  );

  const toBlob = (quality: number) =>
    new Promise<Blob>((resolve, reject) =>
      out.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), OUTPUT_TYPE, quality)
    );

  let quality = 0.9;
  let blob = await toBlob(quality);
  while (blob.size > MAX_OUTPUT_BYTES && quality > 0.4) {
    quality -= 0.1;
    blob = await toBlob(quality);
  }

  const base = (fileName || "profile").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: OUTPUT_TYPE });
}

interface ImageCropModalProps {
  /** Object-URL or data-URL of the image to crop. When null, the modal is closed. */
  src: string | null;
  /** Original file name (used to name the output). */
  fileName?: string;
  title?: string;
  /** 'round' for circular overlay (profile photos), 'rect' for square overlay (facility images). Default: 'round'. */
  cropShape?: "round" | "rect";
  /** Crop aspect ratio (width / height). Default 1 (square). e.g. 3 for a wide logo. */
  aspect?: number;
  /** Show rule-of-thirds grid inside the crop area. Default: false. */
  showGrid?: boolean;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

export default function ImageCropModal({
  src,
  fileName,
  title = "Crop Profile Photo",
  cropShape = "round",
  aspect = 1,
  showGrid = false,
  onCancel,
  onCropped,
}: ImageCropModalProps) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Reset all crop state each time a new image is loaded. Because this
  // component returns null (not unmounts) when src is null, stale state
  // from a previous crop session persists — including `saving = true` which
  // locks the Apply button for every subsequent upload.
  React.useEffect(() => {
    if (!src) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setSaving(false);
  }, [src]);

  // Lock body scroll while the modal is visible; restore on close / unmount.
  // Save and restore scrollY because toggling overflow on the body causes
  // Chrome to reset scroll position when the container is the scroll root.
  React.useEffect(() => {
    if (!src) return;
    const prev = document.body.style.overflow;
    const scrollY = window.scrollY;
    const mainEl = document.querySelector<HTMLElement>('main');
    const mainScrollTop = mainEl?.scrollTop ?? 0;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      window.scrollTo({ top: scrollY, behavior: "instant" });
      if (mainEl) mainEl.scrollTop = mainScrollTop;
    };
  }, [src]);

  // Close on Escape key.
  React.useEffect(() => {
    if (!src || saving) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [src, saving, onCancel]);

  const onCropComplete = React.useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const confirm = async () => {
    if (!src || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const file = await getCroppedFile(src, croppedAreaPixels, rotation, fileName || "profile", aspect);
      onCropped(file);
    } catch (e) {
      console.error("Crop failed:", e);
    } finally {
      setSaving(false);
    }
  };

  if (!src) return null;

  return (
    /*
     * Outer shell: full-screen fixed, uses --z-modal (400) so it sits above the
     * sticky registration sidebar (--z-sticky 200) and any dropdowns (--z-dropdown 100).
     * `items-center` on sm+ and `items-end` on mobile ensures the sheet docks to the
     * bottom edge on small phones and centers on larger screens.
     */
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center p-0 sm:p-4">

      {/* Backdrop — dark semi-transparent overlay with subtle blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={saving ? undefined : onCancel}
        aria-hidden="true"
      />

      {/*
       * Modal card — flex column so the crop area fills all remaining space
       * between the fixed-height header / controls / footer.
       * max-h prevents the card from exceeding the viewport on short screens.
       */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-modal-title"
        className="relative w-full sm:max-w-md bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "min(92dvh, 700px)" }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 id="crop-modal-title" className="text-base font-bold text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/*
         * ── Crop area ──────────────────────────────────────────────────────
         * flex-1 + min-h-0 lets this section shrink/grow to fill whatever
         * space remains after the header, controls, and footer take their share.
         * The 1:1 crop *overlay* is maintained by react-easy-crop's `aspect` prop;
         * the container itself does not need to be square.
         */}
        <div
          className="relative flex-1 min-h-0 overflow-hidden bg-slate-900"
          style={{ minHeight: "220px" }}
        >
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={showGrid}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* ── Controls ───────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 py-4 space-y-3 bg-white">
          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="flex-1 accent-brand-600"
            />
            <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" /> Zoom in
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" /> Zoom out
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" /> Rotate
              </button>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving || !croppedAreaPixels}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

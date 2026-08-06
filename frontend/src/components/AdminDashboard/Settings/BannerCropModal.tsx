'use client';

import { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { X, Crop as CropIcon, ZoomIn } from 'lucide-react';

/** Load an <img> from a data URL (same-origin data URLs need no CORS). */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.src = url;
  });
}

/** Crop `src` to `area` (pixels) and return a JPEG File + its data URL for preview. */
async function getCroppedImage(src: string, area: Area, fileName: string): Promise<{ file: File; dataUrl: string }> {
  const image = await createImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(
    image,
    area.x, area.y, area.width, area.height,
    0, 0, area.width, area.height,
  );
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Crop failed'))), 'image/jpeg', 0.92),
  );
  const base = fileName.replace(/\.[^.]+$/, '') || 'banner';
  const file = new File([blob], `${base}-cropped.jpg`, { type: 'image/jpeg' });
  return { file, dataUrl };
}

interface BannerCropModalProps {
  /** Source image (data URL) to crop. */
  src: string;
  /** Target aspect ratio (width / height) the banner uses. */
  aspect: number;
  /** Original file name, used to name the cropped output. */
  fileName: string;
  onCancel: () => void;
  onCropped: (file: File, dataUrl: string) => void;
}

export default function BannerCropModal({ src, aspect, fileName, onCancel, onCropped }: BannerCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => setArea(areaPixels), []);

  const handleDone = async () => {
    if (!area) return;
    setSaving(true);
    try {
      const { file, dataUrl } = await getCroppedImage(src, area, fileName);
      onCropped(file, dataUrl);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <CropIcon className="h-4 w-4 text-brand-500" /> Crop banner to fit
          </h3>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative h-[300px] sm:h-[360px] bg-slate-900">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            objectFit="contain"
          />
        </div>

        <div className="px-5 py-4">
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <ZoomIn className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-brand-500"
              aria-label="Zoom"
            />
          </label>
          <p className="mt-2 text-xs text-slate-400">
            Drag to reposition · pinch/scroll or use the slider to zoom. The frame matches the live banner ratio.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDone}
              disabled={!area || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              <CropIcon className="h-4 w-4" /> {saving ? 'Cropping…' : 'Crop & use'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

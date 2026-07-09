import axiosInstance from './axios';

// Direct browser → Cloudinary uploads.
//
// Why: the API server runs on Vercel serverless, which hard-caps the request
// body at ~4.5 MB. Vendor registration carries many images, so sending them
// through the API (multipart or base64) fails in production with a network
// error even though it works locally (local Express allows 50 MB). Uploading
// each file straight to Cloudinary keeps the /vendors/register request tiny
// (only URLs), so it never hits the cap or the function timeout.

interface CloudinarySignature {
  timestamp: number;
  folder: string;
  signature: string;
  apiKey: string;
  cloudName: string;
}

// Signatures only sign { timestamp, folder }, so one signature is valid for any
// number of files uploaded to the same folder within Cloudinary's timestamp
// window. Cache per folder to avoid a backend round-trip per file.
const signatureCache = new Map<string, Promise<CloudinarySignature>>();

const getSignature = (folder: string): Promise<CloudinarySignature> => {
  const cached = signatureCache.get(folder);
  if (cached) return cached;
  const req = axiosInstance
    .get('/uploads/signature', { params: { folder } })
    .then((res) => res.data as CloudinarySignature);
  signatureCache.set(folder, req);
  return req;
};

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

// Upload a single File/Blob directly to Cloudinary using a server signature.
export async function uploadFileToCloudinary(
  file: File | Blob,
  folder: string,
): Promise<CloudinaryUploadResult> {
  const sig = await getSignature(folder);

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;
  const res = await fetch(endpoint, { method: 'POST', body: form });
  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message || '';
    } catch {
      /* ignore */
    }
    throw new Error(`Image upload failed${detail ? `: ${detail}` : ''}`);
  }
  const json = await res.json();
  return { url: json.secure_url as string, publicId: json.public_id as string };
}

// Convert a base64 data URI to a Blob and upload it. Non-data-URI strings
// (already Cloudinary URLs) are returned unchanged.
export async function uploadDataUri(value: string, folder: string): Promise<string> {
  if (typeof value !== 'string' || !value.startsWith('data:')) return value;
  const blob = await (await fetch(value)).blob();
  const { url } = await uploadFileToCloudinary(blob, folder);
  return url;
}

// Deep-walk a JSON-ish value and replace every base64 data URI with its uploaded
// Cloudinary URL. Mirrors the backend's resolveBase64InValue so the two paths
// produce identical stored shapes. Values that are already URLs pass through.
export async function resolveBase64Deep(value: any, folder: string): Promise<any> {
  if (value == null) return value;
  if (typeof value === 'string') return uploadDataUri(value, folder);
  if (Array.isArray(value)) return Promise.all(value.map((v) => resolveBase64Deep(v, folder)));
  if (typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [k, await resolveBase64Deep(v, folder)] as const),
    );
    return Object.fromEntries(entries);
  }
  return value;
}

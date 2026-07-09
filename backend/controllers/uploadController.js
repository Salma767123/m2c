const { cloudinary } = require('../config/cloudinary');

// Folders the client is allowed to request a signed upload for. Restricting the
// folder prevents a leaked signature endpoint from being used to write anywhere
// in the Cloudinary account. Keep in sync with the folders used by
// vendorController's uploadFiles() calls.
const ALLOWED_FOLDERS = new Set([
  'vendor-logos',
  'vendor-documents',
  'vendor-documents/gst',
  'vendor-documents/pan',
  'vendor-documents/business-cert',
  'vendor-documents/aadhaar',
  'vendor-documents/iec',
  'vendor-owners',
  'vendor-owner-photos',
  'vendor-factories',
  'vendor-certifications',
  'vendor-contact-photos',
  'products',
]);

// GET /api/uploads/signature?folder=<folder>
// Returns a short-lived signature so the browser can upload a file directly to
// Cloudinary (bypassing the API server, which on Vercel is capped at a 4.5 MB
// request body). The API secret never leaves the server — only the computed
// signature does.
const getUploadSignature = (req, res) => {
  try {
    const requested = typeof req.query.folder === 'string' ? req.query.folder : '';
    const folder = ALLOWED_FOLDERS.has(requested) ? requested : 'vendor-documents';
    const timestamp = Math.round(Date.now() / 1000);

    // Only these params are signed; the client must send exactly the same set
    // (plus file + api_key) to Cloudinary or the signature check will fail.
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET,
    );

    return res.json({
      success: true,
      timestamp,
      folder,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error('Failed to create Cloudinary upload signature:', error);
    return res.status(500).json({ success: false, error: 'Failed to create upload signature' });
  }
};

module.exports = { getUploadSignature };

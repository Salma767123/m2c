const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'auto',
      folder: 'vendor-documents',
      ...options
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(fileBuffer);
  });
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// If `url` is a data URI (data:image/...;base64,...), upload it to Cloudinary
// and return the secure URL. Otherwise returns the input unchanged.
const uploadDataUriIfBase64 = async (url, options = {}) => {
  if (typeof url !== 'string' || !url.startsWith('data:')) return url;
  const match = url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return url;
  const buffer = Buffer.from(match[2], 'base64');
  const result = await uploadToCloudinary(buffer, {
    folder: 'products',
    resource_type: 'image',
    ...options,
  });
  return result.secure_url;
};

// Resolve an array of product image objects ({ url, ... }) — uploads any
// base64 data URIs and replaces with Cloudinary URLs.
const resolveProductImageUrls = async (images) => {
  if (!Array.isArray(images)) return images;
  return Promise.all(
    images.map(async (img) => {
      if (!img || typeof img !== 'object') return img;
      const url = await uploadDataUriIfBase64(img.url);
      return { ...img, url };
    }),
  );
};

// Resolve an array of URL strings (any data URIs get uploaded and replaced).
const resolveVariantImageUrls = async (urls, options = {}) => {
  if (!Array.isArray(urls)) return urls;
  return Promise.all(urls.map((u) => uploadDataUriIfBase64(u, options)));
};

// Deep-walks any JSON-ish value and replaces every base64 data URI string it
// encounters with the uploaded Cloudinary secure URL. Handles string, array,
// plain object. Heavy keys like `data`, `url`, `image`, `photo` etc. are
// covered implicitly since any string value is checked.
const resolveBase64InValue = async (value, options = {}) => {
  if (value == null) return value;
  if (typeof value === 'string') {
    return uploadDataUriIfBase64(value, options);
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => resolveBase64InValue(v, options)));
  }
  if (typeof value === 'object') {
    const entries = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [
        k,
        await resolveBase64InValue(v, options),
      ]),
    );
    return Object.fromEntries(entries);
  }
  return value;
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  uploadDataUriIfBase64,
  resolveProductImageUrls,
  resolveVariantImageUrls,
  resolveBase64InValue,
};
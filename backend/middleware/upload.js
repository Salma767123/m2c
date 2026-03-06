const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'],
    documents: [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  };

  // Check file type based on field name
  if (file.fieldname === 'logo' || 
      file.fieldname === 'ownerPhoto' || 
      file.fieldname === 'ogImage' ||
      file.fieldname.includes('factoryImages')) {
    if (allowedTypes.images.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for images. Only PNG, JPG, WEBP, SVG allowed.'), false);
    }
  } else {
    // For documents (certificates, GST, etc.)
    if (allowedTypes.documents.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for documents. Only PDF, PNG, JPG, WEBP, DOC allowed.'), false);
    }
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 20 // Maximum 20 files
  }
});

// Define upload fields for vendor registration
const vendorUploadFields = upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'gstDocument', maxCount: 1 },
  { name: 'ownerPhoto', maxCount: 1 },
  { name: 'factoryImages', maxCount: 10 },
  { name: 'certificationFiles', maxCount: 10 },
  { name: 'otherDocuments', maxCount: 5 }
]);

// Single file upload for specific fields
const singleFileUpload = (fieldName) => {
  return upload.single(fieldName);
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 10MB per file.' 
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files. Maximum allowed files exceeded.' 
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: 'Unexpected file field.' 
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ 
      error: error.message 
    });
  }
  
  next(error);
};

module.exports = {
  upload,
  vendorUploadFields,
  singleFileUpload,
  handleUploadError
};
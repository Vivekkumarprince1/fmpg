const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

function sanitizeFolderSegment(value) {
  return String(value || 'property')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-');
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const propertyName = sanitizeFolderSegment(req.body.propertyName);
    const isContract = file.fieldname === 'tenantContract';

    return {
      folder: isContract ? `fmpg/tenant-contracts/${propertyName}` : `fmpg/property-images/${propertyName}`,
      resource_type: 'auto',
      public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }

    return cb(new Error('Only images (jpg, jpeg, png) and PDFs are allowed!'));
  },
});

const uploadPropertyAssets = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'tenantContract', maxCount: 1 },
]);

module.exports = {
  uploadPropertyAssets,
  isCloudinaryConfigured,
};

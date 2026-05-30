const { v2: cloudinary } = require('cloudinary');
const staticAssetMap = require('./staticAssetMap.json');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

function isCloudinaryConfigured() {
  return Boolean(cloudName && apiKey && apiSecret);
}

function isCloudinaryUrl(value) {
  return typeof value === 'string' && /res\.cloudinary\.com/.test(value);
}

function toAssetUrl(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const normalizedPath = value
    .replace(/^\/+/, '')
    .replace(/^public\//, '');

  if (staticAssetMap[normalizedPath]) {
    return staticAssetMap[normalizedPath];
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return value;
  }

  return `/${value.replace(/^public\//, '')}`;
}

async function deleteFromCloudinary(url) {
  if (!isCloudinaryConfigured() || !isCloudinaryUrl(url)) {
    return;
  }

  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^/.?]+(?:\?.*)?$/i);
  if (!match || !match[1]) {
    return;
  }

  const publicId = match[1];
  const resourceType = /\/raw\/upload\//.test(url) ? 'raw' : 'image';

  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  isCloudinaryUrl,
  toAssetUrl,
  deleteFromCloudinary,
};

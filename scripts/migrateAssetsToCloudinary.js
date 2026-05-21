require('dotenv').config();

// Workaround for Node.js v22+ / c-ares DNS resolution bug on Windows
// const dns = require('dns');
// dns.setServers(['1.1.1.1', '8.8.8.8']);

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const Owner = require('../models/owner');
const { cloudinary, isCloudinaryConfigured, isCloudinaryUrl } = require('../config/cloudinary');

function toLocalFilePath(assetPath) {
  if (!assetPath || typeof assetPath !== 'string') {
    return null;
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return null;
  }

  const cleaned = assetPath.replace(/^\/+/, '').replace(/^public\//, '');
  return path.join(process.cwd(), 'public', cleaned);
}

async function uploadLocalAsset(assetPath, folder) {
  if (!assetPath || isCloudinaryUrl(assetPath)) {
    return assetPath;
  }

  const localFilePath = toLocalFilePath(assetPath);
  if (!localFilePath || !fs.existsSync(localFilePath)) {
    console.warn(`Skipping missing file: ${assetPath}`);
    return assetPath;
  }

  const uploaded = await cloudinary.uploader.upload(localFilePath, {
    folder,
    resource_type: 'auto',
    use_filename: true,
    unique_filename: true,
  });

  return uploaded.secure_url;
}

async function migrateProperties() {
  const properties = await Property.find({});
  let updated = 0;

  for (const property of properties) {
    let changed = false;

    if (Array.isArray(property.images) && property.images.length > 0) {
      const migratedImages = [];
      for (const imagePath of property.images) {
        const migrated = await uploadLocalAsset(imagePath, 'fmpg/property-images/migrated');
        migratedImages.push(migrated);
        if (migrated !== imagePath) {
          changed = true;
        }
      }
      property.images = migratedImages;
    }

    if (property.tenantContract) {
      const migratedContract = await uploadLocalAsset(property.tenantContract, 'fmpg/tenant-contracts/migrated');
      if (migratedContract !== property.tenantContract) {
        property.tenantContract = migratedContract;
        changed = true;
      }
    }

    if (changed) {
      await Property.updateOne(
        { _id: property._id },
        {
          $set: {
            images: property.images,
            tenantContract: property.tenantContract,
          },
        }
      );
      updated += 1;
      console.log(`Updated Property: ${property._id}`);
    }
  }

  return updated;
}

async function migrateOwners() {
  const owners = await Owner.find({});
  let updated = 0;

  for (const owner of owners) {
    let changed = false;

    if (Array.isArray(owner.images) && owner.images.length > 0) {
      const migratedImages = [];
      for (const imagePath of owner.images) {
        const migrated = await uploadLocalAsset(imagePath, 'fmpg/owner-images/migrated');
        migratedImages.push(migrated);
        if (migrated !== imagePath) {
          changed = true;
        }
      }
      owner.images = migratedImages;
    }

    if (owner.tenantContract) {
      const migratedContract = await uploadLocalAsset(owner.tenantContract, 'fmpg/tenant-contracts/migrated');
      if (migratedContract !== owner.tenantContract) {
        owner.tenantContract = migratedContract;
        changed = true;
      }
    }

    if (changed) {
      await Owner.updateOne(
        { _id: owner._id },
        {
          $set: {
            images: owner.images,
            tenantContract: owner.tenantContract,
          },
        }
      );
      updated += 1;
      console.log(`Updated Owner: ${owner._id}`);
    }
  }

  return updated;
}

async function run() {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
  }

  const mongoUrl = process.env.MONGODB_URI;
  if (!mongoUrl) {
    throw new Error('MONGODB_URI is required.');
  }

  await mongoose.connect(mongoUrl);
  console.log('MongoDB connected for migration');

  const migratedProperties = await migrateProperties();
  const migratedOwners = await migrateOwners();

  console.log(`Migration complete. Updated properties: ${migratedProperties}, owners: ${migratedOwners}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Cloudinary migration failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // ignore disconnect error during failure
  }
  process.exit(1);
});

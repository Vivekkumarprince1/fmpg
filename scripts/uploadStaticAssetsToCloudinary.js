require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, 'public');
const mapFilePath = path.join(projectRoot, 'config', 'staticAssetMap.json');

const explicitAssetPaths = [
  'PG-photos/radheshyam pg.jpg',
  'PG-photos/mundi outside.jpg',
  'PG-photos/sahara outside.jpg',
  'PG-photos/heaven pg main gate.jpg',
  'PG-photos/white house pg.jpg',
  'PG-photos/shivalik main gate.jpg',
  'PG-photos/sahara-1.jpg',
  'images/wave.png',
  'images/bg.svg',
  'images/avatar.svg',
];

const uploadableExtensions = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.avif']);
const maxUploadSizeBytes = 10 * 1024 * 1024;

function walkFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function toRelativePublicPath(filePath) {
  return path.relative(publicRoot, filePath).replace(/\\/g, '/');
}

function toFolder(relativePath) {
  const directory = path.dirname(relativePath);
  return `fmpg/static/${directory === '.' ? '' : directory}`.replace(/\/$/, '');
}

async function run() {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
  }

  const currentMap = fs.existsSync(mapFilePath)
    ? JSON.parse(fs.readFileSync(mapFilePath, 'utf8'))
    : {};

  const assetsImageFiles = walkFiles(path.join(publicRoot, 'assets', 'images'));
  const imgFiles = walkFiles(path.join(publicRoot, 'img'));
  const imagesFiles = walkFiles(path.join(publicRoot, 'images'));
  const explicitFiles = explicitAssetPaths
    .map((relativePath) => path.join(publicRoot, relativePath))
    .filter((absolutePath) => fs.existsSync(absolutePath));

  const uniqueFiles = [...new Set([...assetsImageFiles, ...imgFiles, ...imagesFiles, ...explicitFiles])]
    .filter((filePath) => uploadableExtensions.has(path.extname(filePath).toLowerCase()));

  if (uniqueFiles.length === 0) {
    console.log('No static image files found to upload.');
    return;
  }

  for (const filePath of uniqueFiles) {
    const relativePath = toRelativePublicPath(filePath);

    if (currentMap[relativePath]) {
      console.log(`Skipped (already mapped): ${relativePath}`);
      continue;
    }

    const folder = toFolder(relativePath);
    const extension = path.extname(relativePath).replace('.', '').toLowerCase();

    const fileStats = fs.statSync(filePath);
    if (fileStats.size > maxUploadSizeBytes) {
      console.log(`Skipped (too large): ${relativePath}`);
      continue;
    }

    try {
      const uploaded = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        format: extension || undefined,
      });

      currentMap[relativePath] = uploaded.secure_url;
      console.log(`Uploaded: ${relativePath}`);
    } catch (error) {
      console.log(`Skipped (upload failed): ${relativePath} - ${error.message}`);
    }
  }

  fs.writeFileSync(mapFilePath, `${JSON.stringify(currentMap, null, 2)}\n`);
  console.log(`Static asset map updated: ${mapFilePath}`);
}

run().catch((error) => {
  console.error('Static asset upload failed:', error.message);
  process.exit(1);
});

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { S3 } = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID; // used for public URL pattern if needed

if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.warn('Warning: R2 credentials not fully configured. /api/r2/upload will fail until env vars are set.');
}

// Create S3 client configured for Cloudflare R2 (S3 compatible endpoint)
const s3 = new S3({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  s3ForcePathStyle: false,
  signatureVersion: 'v4',
  region: process.env.R2_REGION || 'auto'
});

// Basic CORS middleware for API endpoints (adjust in production as needed)
app.use((req, res, next) => {
  // Allow a specific origin if provided, otherwise allow all (use cautiously)
  const allowedOrigin = process.env.CORS_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  // Handle preflight
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Root and health routes
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <html>
      <head><title>R2 Upload Proxy</title></head>
      <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; line-height:1.6; padding:24px;">
        <h1>R2 Upload Proxy</h1>
        <p>This service provides two main endpoints used by the app:</p>
        <ul>
          <li><strong>POST</strong> <code>/api/r2/upload</code> - multipart/form-data file upload (field name: <code>file</code>)</li>
          <li><strong>GET</strong> <code>/api/r2/media?path=&lt;object-key&gt;</code> - proxy media with Range + CORS support</li>
        </ul>
        <p>Use <a href="/api/r2/media">/api/r2/media?path=... (example)</a> to stream objects (requires <code>path</code>).</p>
        <p><a href="/health">Health check</a></p>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'r2-proxy', timestamp: Date.now() });
});

app.post('/api/r2/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const category = req.body.category || 'general';
    const originalName = req.file.originalname || 'file';
    const ext = path.extname(originalName) || '';
    const key = `${category}/${Date.now()}_${uuidv4()}${ext}`;

    const params = {
      Bucket: R2_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    };

    const putResp = await s3.putObject(params).promise();

    // Construct a public URL - depending on your R2 configuration this may vary.
    // Many Cloudflare R2 setups use a custom domain or an account-specific public URL.
    const publicUrl = process.env.R2_PUBLIC_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;

    res.json({ url: publicUrl, path: key, name: originalName, size: req.file.size, s3: putResp });
  } catch (err) {
    console.error('R2 upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err && err.message });
  }
});

/**
 * Stream an object from R2 through this proxy with proper CORS and Range support.
 * Query params: ?path=<object-key>
 * Supports Range requests for video seeking.
 */
app.get('/api/r2/media', async (req, res) => {
  try {
    const key = req.query.path;
    if (!key) return res.status(400).json({ error: 'Missing path query parameter' });

    const params = {
      Bucket: R2_BUCKET,
      Key: String(key)
    };

    // Always allow CORS for media served by this endpoint (adjust for production)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length,Content-Range');

    const range = req.headers.range;
    if (range) {
      // Partial content requested - support seeking
      // Get object size first
      const head = await s3.headObject(params).promise();
      const total = head.ContentLength;

      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
      if (isNaN(start) || isNaN(end) || start >= total) {
        return res.status(416).set('Content-Range', `bytes */${total}`).end();
      }

      const chunkSize = (end - start) + 1;
      const s3Params = Object.assign({}, params, { Range: `bytes=${start}-${end}` });

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', head.ContentType || 'application/octet-stream');

      const stream = s3.getObject(s3Params).createReadStream();
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) res.status(500).end('Stream error');
      });
      stream.pipe(res);
      return;
    }

    // No range - stream whole object
    const head = await s3.headObject(params).promise();
    res.setHeader('Content-Length', head.ContentLength);
    res.setHeader('Content-Type', head.ContentType || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = s3.getObject(params).createReadStream();
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.status(500).end('Stream error');
    });
    stream.pipe(res);
  } catch (err) {
    console.error('R2 media stream error:', err);
    res.status(500).json({ error: 'Failed to stream media', details: err && err.message });
  }
});

const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log(`R2 upload proxy listening on http://localhost:${port}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Another process is listening on this port.`);
    console.error('If you want to run the server on a different port, set the PORT environment variable, e.g.');
    console.error('  PowerShell: $env:PORT = "4001"; npm run start');
    console.error('  Linux/macOS: PORT=4001 npm run start');
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});

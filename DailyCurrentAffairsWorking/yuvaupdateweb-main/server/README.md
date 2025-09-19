# R2 Upload Proxy

This is a small Express server that provides a secure `/api/r2/upload` endpoint for uploading files to Cloudflare R2. The frontend (admin panel) posts files to this endpoint to avoid exposing R2 credentials in the browser.

## Quick start

1. Copy `.env.example` to `.env` and fill in your Cloudflare R2 credentials.

2. Install dependencies and run:

```powershell
cd server
npm install
npm run start
```

3. By default the server listens on port `4000`. The admin frontend expects the endpoint at `/api/r2/upload` — if your frontend is served from a different origin in development, configure a proxy or CORS as needed.

## Request

POST `/api/r2/upload` (multipart/form-data)

Form fields:
- `file` — the file binary (required)
- `category` — optional category used as path prefix

Response JSON:

```
{
  "url": "https://...", // public URL to access the uploaded file
  "path": "category/12345_uuid.mp4",
  "name": "original-filename.mp4",
  "size": 12345
}
```

## Notes
- The server uses the AWS SDK v2 S3 client configured with a Cloudflare R2 endpoint. Adjust `R2_ENDPOINT` or `R2_PUBLIC_URL` if you use a custom domain.
- Ensure your R2 bucket is configured to allow public read (or configure signed URLs if preferred).

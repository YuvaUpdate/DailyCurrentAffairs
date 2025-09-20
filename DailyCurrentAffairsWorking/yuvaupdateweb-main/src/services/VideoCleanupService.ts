import { webFileUploadService } from './WebFileUploadService';

/**
 * Frontend helper to request the server to delete R2 objects and to delete
 * entries from Firestore via the existing VideoService.
 */
import { VideoService } from './VideoService';

export class VideoCleanupService {
  /**
   * Request server to delete an object from R2. Returns true on success.
   */
  // Return a rich result so callers can report errors back to the admin UI
  static async deleteR2Object(objectKey: string): Promise<{ ok: boolean; status?: number; body?: string; url?: string; error?: string }> {
    try {
      const runtimeGlobal = (window as any).__API_BASE__ || (globalThis as any).API_BASE;
      const viteBase = (import.meta.env.VITE_API_BASE_URL as string) || '';
      const svcBase = ((webFileUploadService as any).API_BASE as string) || '';
      const apiBase = (runtimeGlobal || viteBase || svcBase || '').replace(/\/$/, '');
      const url = apiBase ? `${apiBase}/api/r2/delete` : `/api/r2/delete`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: objectKey })
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '<no body>');
        console.error('Failed to delete R2 object', { url, status: resp.status, body: txt });
        return { ok: false, status: resp.status, body: txt, url };
      }
      return { ok: true, status: resp.status, url };
    } catch (e: any) {
      console.error('deleteR2Object error', e);
      return { ok: false, error: e && e.message ? e.message : String(e) };
    }
  }

  /**
   * Deletes the N oldest videos from Firestore and their storage locations.
   * - Deletes Firestore document
   * - If the document has `mediaPath` (Firebase) or a proxied `videoUrl` with `/api/r2/media?path=...`, remove the stored object
   */
  static async deleteOldestN(n: number): Promise<{ deleted: number; errors: any[] }> {
    const errors: any[] = [];
    let deleted = 0;
    try {
      // Fetch oldest N active videos ordered by timestamp ascending
      const { VideoService: FirebaseVideoService } = await import('./VideoService');
      // VideoService.getVideos returns newest-first; use Firebase service directly via VideoServiceFirebase?
      // Simpler approach: fetch many and pick oldest N
      const page = await FirebaseVideoService.getVideos(1000 as any);
      const allVideos = page.videos || [];
      // Filter active videos
      const active = allVideos.filter(v => v.isActive !== false);
      // Sort ascending (oldest first)
      active.sort((a: any, b: any) => {
        const ta = new Date(a.timestamp || 0).getTime();
        const tb = new Date(b.timestamp || 0).getTime();
        return ta - tb;
      });

      const toDelete = active.slice(0, n);
      for (const v of toDelete) {
        try {
          // Attempt to delete storage object if possible
          const url = v.videoUrl || '';
          // Try multiple strategies to find the R2 object key:
          // 1) proxied path: /api/r2/media?path=<key> (may be absolute or relative)
          // 2) Cloudflare R2 public URL: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
          // 3) Custom domain pointing directly to object: https://cdn.example.com/<key>
          let attemptedR2Delete = false;
          try {
            // Strategy A: proxied path param (works for absolute and relative URLs)
            const proxiedMatch = url.match(/[?&]path=([^&]+)/);
            if (proxiedMatch && proxiedMatch[1]) {
              const key = decodeURIComponent(proxiedMatch[1]);
              attemptedR2Delete = true;
              const result = await this.deleteR2Object(key);
              if (!result.ok) {
                console.warn('Failed to delete R2 object (proxied):', key, result);
                errors.push({ id: v.id, key, reason: result });
              }
            } else {
              // Strategy B: parse as URL and attempt to extract object key
              try {
                const baseForParse = (import.meta.env.VITE_API_BASE_URL as string) || (window as any).__API_BASE__ || window.location?.origin;
                const u = new URL(url, baseForParse);
                // If hostname looks like Cloudflare R2 account host
                if (u.hostname && u.hostname.includes('.r2.cloudflarestorage.com')) {
                  const segments = u.pathname.split('/').filter(Boolean);
                  if (segments.length >= 2) {
                    // pattern: /<bucket>/<key...>
                    const key = segments.slice(1).join('/');
                    attemptedR2Delete = true;
                    const result = await this.deleteR2Object(decodeURIComponent(key));
                    if (!result.ok) {
                      console.warn('Failed to delete R2 object (public url):', key, result);
                      errors.push({ id: v.id, key, reason: result });
                    }
                  } else if (segments.length === 1) {
                    // fallback: treat entire path as key
                    const key = segments[0];
                    attemptedR2Delete = true;
                    const result = await this.deleteR2Object(decodeURIComponent(key));
                    if (!result.ok) {
                      console.warn('Failed to delete R2 object (public url fallback):', key, result);
                      errors.push({ id: v.id, key, reason: result });
                    }
                  }
                } else {
                  // Strategy C: custom domain or CDN - assume pathname (without leading slash) is the key
                  const pathnameKey = u.pathname.replace(/^\//, '');
                  if (pathnameKey) {
                    attemptedR2Delete = true;
                    const result = await this.deleteR2Object(decodeURIComponent(pathnameKey));
                    if (!result.ok) {
                      console.warn('Failed to delete R2 object (custom domain path):', pathnameKey, result);
                      errors.push({ id: v.id, key: pathnameKey, reason: result });
                    }
                  }
                }
              } catch (err) {
                // URL parsing failed - skip R2 delete attempt for this URL
                console.warn('VideoCleanupService: failed parsing URL for R2 deletion', url, err);
              }
            }
          } catch (err) {
            console.error('Error attempting R2 deletion for url', url, err);
            errors.push({ id: v.id, url, error: String(err) });
          }

          if (!attemptedR2Delete) {
            console.log('No R2 object detected for video, skipping R2 delete for:', v.id);
          }
          const mediaPath = (v as any).mediaPath as string | undefined;
          if (mediaPath && mediaPath.length > 0) {
            // delete from Firebase Storage via existing helper (client side)
            try {
              await webFileUploadService.deleteFile(mediaPath);
            } catch (e) {
              console.warn('Failed to delete Firebase storage path:', mediaPath, e);
            }
          }

          // Delete Firestore document
          await VideoService.deleteVideo(String(v.id));
          deleted++;
        } catch (e) {
          console.error('Failed to delete video', v.id, e);
          errors.push({ id: v.id, error: e });
        }
      }

      return { deleted, errors };
    } catch (e) {
      console.error('deleteOldestN failed', e);
      return { deleted, errors: [{ error: e }] };
    }
  }
}

export default VideoCleanupService;

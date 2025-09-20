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
  static async deleteR2Object(objectKey: string): Promise<boolean> {
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL as string) || (window as any).__API_BASE__ || '';
      const url = `${apiBase.replace(/\/$/, '')}/api/r2/delete`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: objectKey })
      });
      if (!resp.ok) {
        console.error('Failed to delete R2 object', await resp.text());
        return false;
      }
      return true;
    } catch (e) {
      console.error('deleteR2Object error', e);
      return false;
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
          if (url.includes('/api/r2/media')) {
            // extract path param
            const m = url.match(/path=([^&]+)/);
            if (m && m[1]) {
              const key = decodeURIComponent(m[1]);
              const ok = await this.deleteR2Object(key);
              if (!ok) console.warn('Failed to delete R2 object:', key);
            }
          }
          if (v.mediaPath && v.mediaPath.length > 0) {
            // delete from Firebase Storage via existing helper (client side)
            try {
              await webFileUploadService.deleteFile(v.mediaPath);
            } catch (e) {
              console.warn('Failed to delete Firebase storage path:', v.mediaPath, e);
            }
          }

          // Delete Firestore document
          await VideoService.deleteVideo(v.id);
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

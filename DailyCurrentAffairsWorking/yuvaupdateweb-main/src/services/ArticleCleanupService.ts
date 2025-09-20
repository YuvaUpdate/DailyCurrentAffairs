import { firebaseNewsService } from './FirebaseNewsService';
import { webFileUploadService } from './WebFileUploadService';
import { VideoService } from './VideoService';

/**
 * Simple frontend service to delete oldest N articles and their stored images in Firebase Storage.
 * - Fetches many articles, picks oldest N, removes associated image storage paths (mediaPath) via webFileUploadService.deleteFile,
 *   and deletes Firestore documents via firebaseNewsService.deleteArticle.
 * - Returns { deleted, errors } for reporting.
 */

export class ArticleCleanupService {
  static async deleteOldestN(n: number): Promise<{ deleted: number; errors: any[] }> {
    const errors: any[] = [];
    let deleted = 0;
    try {
      // Fetch a large page of articles and pick the oldest N
      const articles = await firebaseNewsService.getArticlesWithDocIds();
      if (!Array.isArray(articles) || articles.length === 0) return { deleted: 0, errors };

      // Helper: robustly get milliseconds since epoch from various timestamp shapes
      const toMillis = (ts: any): number => {
        if (ts == null) return 0;
        // Firestore Timestamp has seconds/nanoseconds
        if (typeof ts === 'object') {
          if (typeof ts.seconds === 'number') {
            return ts.seconds * 1000 + (typeof ts.nanoseconds === 'number' ? Math.floor(ts.nanoseconds / 1e6) : 0);
          }
          if (typeof ts.toDate === 'function') {
            try { return ts.toDate().getTime(); } catch (_) { }
          }
        }
        if (typeof ts === 'number') return ts;
        // Try parsing string
        const parsed = Date.parse(String(ts));
        if (!Number.isNaN(parsed)) return parsed;
        return 0;
      };

      // Normalize and sort by timestamp ascending (oldest first)
      const normalized = articles.map(a => ({ ...a, __tsMillis: toMillis(a.timestamp), timestampRaw: a.timestamp }));
      normalized.sort((x: any, y: any) => (x.__tsMillis || 0) - (y.__tsMillis || 0));

      // Log which items will be deleted for transparency (title, docId, timestamp)
      const toDeletePreview = normalized.slice(0, n).map((a: any) => ({ id: a.docId || a.id, title: a.headline || a.title, ts: a.__tsMillis, raw: a.timestampRaw }));
      console.log('ArticleCleanupService: deleting oldest N preview:', toDeletePreview);

  const toDelete = normalized.slice(0, n);
      for (const art of toDelete) {
        try {
          const mediaPath = (art as any).mediaPath as string | undefined;
          if (mediaPath) {
            try {
              await webFileUploadService.deleteFile(mediaPath);
            } catch (err) {
              console.warn('Failed to delete article image in Firebase Storage', mediaPath, err);
              errors.push({ id: art.docId || art.id, mediaPath, error: String(err) });
            }
          }

          // Delete Firestore document via service
          try {
            await firebaseNewsService.deleteArticle(art.docId || art.id);
            deleted++;
          } catch (err) {
            console.error('Failed to delete Firestore article', art.docId || art.id, err);
            errors.push({ id: art.docId || art.id, error: String(err) });
          }
        } catch (err) {
          console.error('Error deleting article', art, err);
          errors.push({ id: art.docId || art.id, error: String(err) });
        }
      }

      return { deleted, errors };
    } catch (err) {
      console.error('deleteOldestN articles failed', err);
      return { deleted, errors: [{ error: String(err) }] };
    }
  }
}

export default ArticleCleanupService;

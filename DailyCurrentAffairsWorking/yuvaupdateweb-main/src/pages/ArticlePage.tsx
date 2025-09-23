import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { firebaseNewsService } from '@/services/FirebaseNewsService';
import { Article as ArticleType } from '@/types/article';
import { NewsArticle } from '@/types';
import { ArticleModal } from '@/components/news/ArticleModal';
import NotFound from './NotFound';
import SEO from '@/components/SEO';

const ArticlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<ArticleType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const articles: NewsArticle[] = await firebaseNewsService.getArticles();
        // Try to find by docId or id (both may be used in the codebase)
        const found = articles.find(a => String((a as any).docId ?? a.id) === String(id));
        if (found) {
          // Map NewsArticle -> ArticleType
          const mapped: ArticleType = {
            id: String((found as any).docId ?? found.id),
            title: found.headline || found.description || 'Untitled',
            summary: found.description || found.fullText || '',
            content: (found as any).fullText || undefined,
            imageUrl: found.image || found.imageUrl || '',
            youtubeUrl: found.youtubeUrl,
            videoUrl: undefined,
            source: found.source || '',
            sourceUrl: (found as any).sourceUrl || found.link || '',
            publishedAt: found.timestamp ? new Date(found.timestamp) : new Date(),
            category: found.category,
            tags: (found as any).tags || [],
            readTime: found.readTime,
            mediaType: found.mediaType as any,
            mediaPath: found.mediaPath || ''
          };
          if (mounted) setArticle(mapped);
        } else {
          if (mounted) setArticle(null);
        }
      } catch (err) {
        console.error('Error loading article for id', id, err);
        if (mounted) setArticle(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  if (!loading && !article) return <NotFound />;

  // Render modal-like full article page and include SEO meta
  return (
    <>
      {article && (
        <SEO
          isArticle
          title={article.title}
          description={article.summary}
          url={`https://yuvaupdate.in/article/${id}`}
          image={article.imageUrl}
          publishedAt={article.publishedAt ? (article.publishedAt instanceof Date ? article.publishedAt.toISOString() : String(article.publishedAt)) : undefined}
          modifiedAt={undefined}
          authorName={undefined}
          tags={article.tags}
        />
      )}

      <div className="min-h-screen w-full bg-background">
        <div className="max-w-content mx-auto p-6">
          <Link to="/" className="text-sm text-primary underline">← Back to Home</Link>

          {loading ? (
            <div className="text-center py-12">Loading article…</div>
          ) : (
            article && (
              <article className="prose prose-lg dark:prose-invert max-w-none mt-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-muted-foreground">{article.category}</span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{article.source}</span>
                </div>
                <h1 className="text-2xl font-bold">{article.title}</h1>

                {article.imageUrl && (
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mt-4">
                    <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <p className="lead mt-4 text-muted-foreground">{article.summary}</p>

                {article.content ? (
                  <div dangerouslySetInnerHTML={{ __html: article.content }} />
                ) : (
                  <p className="text-muted-foreground">Full article content not available in preview.</p>
                )}

                {article.tags && article.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {article.tags.map((t, i) => (
                      <span key={i} className="text-sm bg-muted px-2 py-1 rounded">#{t}</span>
                    ))}
                  </div>
                )}
              </article>
            )
          )}
        </div>
      </div>

      {/* Keep modal implementation for compatibility with other flows */}
      <ArticleModal article={article} isOpen={false} onClose={() => {}} onOpenLink={() => {}} />
    </>
  );
};

export default ArticlePage;

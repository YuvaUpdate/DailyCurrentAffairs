import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { firebaseNewsService } from '@/services/FirebaseNewsService';
import { ArticleCard } from '@/components/news/ArticleCard';
import { Article as ArticleType } from '@/types/article';
import { NewsArticle } from '@/types';
import SEO, { categoryBreadcrumbs } from '@/components/SEO';

const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [articles, setArticles] = useState<ArticleType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const list: NewsArticle[] = await firebaseNewsService.getArticlesByCategory(slug || '');
        const mapped = list.map(n => ({
          id: String((n as any).docId ?? n.id),
          title: n.headline || n.description || 'Untitled',
          summary: n.description || n.fullText || '',
          content: (n as any).fullText || undefined,
          imageUrl: n.image || n.imageUrl || '',
          youtubeUrl: n.youtubeUrl,
          videoUrl: undefined,
          source: n.source || '',
          sourceUrl: (n as any).sourceUrl || n.link || '',
          publishedAt: n.timestamp ? new Date(n.timestamp) : new Date(),
          category: n.category,
          tags: (n as any).tags || [],
          readTime: n.readTime,
          mediaType: n.mediaType as any,
          mediaPath: n.mediaPath || ''
        } as ArticleType));
        if (mounted) setArticles(mapped);
      } catch (err) {
        console.error('Error loading category articles', err);
        if (mounted) setArticles([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [slug]);

  const categoryName = slug || 'Category';

  return (
    <>
      <SEO title={`${categoryName} - YuvaUpdate`} description={`Latest articles from ${categoryName}`} url={`https://yuvaupdate.in/category/${slug}/`} breadcrumbs={categoryBreadcrumbs(slug || '', categoryName)} />

      <div className="min-h-screen w-full bg-background">
        <div className="max-w-content mx-auto p-6">
          <Link to="/" className="text-sm text-primary underline">← Back to Home</Link>
          <h1 className="text-2xl font-bold mt-4">{categoryName}</h1>

          {loading ? (
            <div className="py-12 text-center">Loading articles…</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mt-6">
              {articles.map(a => (
                <ArticleCard key={String(a.id)} article={a as any} onReadMore={() => {}} onOpenLink={() => {}} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CategoryPage;

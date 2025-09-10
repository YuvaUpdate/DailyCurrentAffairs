import { firebaseNewsService } from './FirebaseNewsService';

export class SitemapGenerator {
  /**
   * Generate a dynamic sitemap for articles
   * This can be used to create article-specific sitemaps
   */
  static async generateArticlesSitemap(): Promise<string> {
    try {
      const articles = await firebaseNewsService.getArticles();
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      // Add each article as a URL in the sitemap
      articles.forEach((article, index) => {
        const articleUrl = `https://www.yuvaupdate.in/article/${article.id}`;
        const lastmod = new Date().toISOString();
        
        sitemap += `
  <url>
    <loc>${articleUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
      });

      sitemap += `
</urlset>`;

      return sitemap;
    } catch (error) {
      console.error('Error generating articles sitemap:', error);
      return '';
    }
  }

  /**
   * Generate a comprehensive sitemap including both static pages and articles
   */
  static async generateCompleteSitemap(): Promise<string> {
    const staticPages = [
      { url: 'https://www.yuvaupdate.in/', priority: '1.0', changefreq: 'daily' },
      { url: 'https://www.yuvaupdate.in/about', priority: '0.8', changefreq: 'monthly' },
      { url: 'https://www.yuvaupdate.in/privacy', priority: '0.6', changefreq: 'monthly' },
      { url: 'https://www.yuvaupdate.in/terms', priority: '0.6', changefreq: 'monthly' },
      { url: 'https://www.yuvaupdate.in/support', priority: '0.7', changefreq: 'monthly' }
    ];

    try {
      const articles = await firebaseNewsService.getArticles();
      const lastmod = new Date().toISOString();
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      // Add static pages
      staticPages.forEach(page => {
        sitemap += `
  <url>
    <loc>${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
      });

      // Add articles
      articles.forEach((article) => {
        const articleUrl = `https://www.yuvaupdate.in/article/${article.id}`;
        
        sitemap += `
  <url>
    <loc>${articleUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
      });

      sitemap += `
</urlset>`;

      return sitemap;
    } catch (error) {
      console.error('Error generating complete sitemap:', error);
      // Return basic sitemap if article fetching fails
      let basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
      
      staticPages.forEach(page => {
        basicSitemap += `
  <url>
    <loc>${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
      });
      
      basicSitemap += `
</urlset>`;
      
      return basicSitemap;
    }
  }
}

// Export for potential API endpoint use
export default SitemapGenerator;

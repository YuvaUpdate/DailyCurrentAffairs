import { Handler } from '@netlify/functions';
import SitemapGenerator from '../../src/services/SitemapGenerator';

const handler: Handler = async (event, context) => {
  try {
    const sitemap = await SitemapGenerator.generateCompleteSitemap();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300'
      },
      body: sitemap,
    };
  } catch (err) {
    console.error('Failed to generate sitemap:', err);
    return {
      statusCode: 500,
      body: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    };
  }
};

export { handler };

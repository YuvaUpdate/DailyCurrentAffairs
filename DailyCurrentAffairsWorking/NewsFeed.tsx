import React from 'react';
import NewsFeed_Inshorts from './NewsFeed_Inshorts';
import { NewsArticle } from './types';

interface NewsFeedWrapperProps {
	articles: Array<any>;
	onRefresh?: () => void;
	refreshing?: boolean;
		onBookmarkToggle?: (articleId: string | number) => void;
		bookmarkedArticles?: Set<string>;
	isDarkMode?: boolean;
	immersive?: boolean;
	onCategoryBarLayout?: (layout: { y: number; height: number }) => void;
}

// Map external article shape (title/date) to internal NewsArticle shape
const mapArticle = (a: any): NewsArticle => ({
	id: a.id,
	headline: a.title || a.headline || '',
	description: a.description || a.summary || a.fullText || '',
	image: a.image || a.imageUrl || a.thumbnail || '',
	timestamp: a.date || a.timestamp || new Date().toISOString(),
	readTime: a.readTime || a.read_time || a.read || '',
	category: a.category || a.section || '',
	mediaType: a.mediaType || (a.videoUrl ? 'video' : 'image'),
	sourceUrl: a.sourceUrl || a.source_url || a.link || ''
});

export default function NewsFeed(props: NewsFeedWrapperProps) {
	const mapped: NewsArticle[] = (props.articles || []).map(mapArticle);
	const bookmarkedSet = props.bookmarkedArticles instanceof Set
			? props.bookmarkedArticles as Set<string | number>
		: new Set<string | number>(Array.isArray(props.bookmarkedArticles) ? props.bookmarkedArticles : []);

	return (
		<NewsFeed_Inshorts
			articles={mapped}
			onRefresh={props.onRefresh}
			refreshing={props.refreshing}
			onBookmarkToggle={props.onBookmarkToggle}
			bookmarkedArticles={bookmarkedSet}
			isDarkMode={props.isDarkMode}
			onCategoryBarLayout={props.onCategoryBarLayout}
		/>
	);
}

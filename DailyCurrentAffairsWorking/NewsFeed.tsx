import React from 'react';
import NewsFeed_Inshorts from './NewsFeed_Inshorts';
import { NewsArticle } from './types';

interface NewsFeedWrapperProps {
	articles: Array<any>;
	onRefresh?: () => void;
	refreshing?: boolean;
	onBookmarkToggle?: (articleId: number) => void;
	bookmarkedArticles?: Set<number> | number[];
	isDarkMode?: boolean;
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
	fullText: a.fullText || a.full_text || a.body || a.description || '',
	sourceUrl: a.sourceUrl || a.source_url || a.link || ''
});

export default function NewsFeed(props: NewsFeedWrapperProps) {
	const mapped: NewsArticle[] = (props.articles || []).map(mapArticle);
	const bookmarkedSet = props.bookmarkedArticles instanceof Set
		? props.bookmarkedArticles
		: new Set<number>(Array.isArray(props.bookmarkedArticles) ? props.bookmarkedArticles : []);

	return (
		<NewsFeed_Inshorts
			articles={mapped}
			onRefresh={props.onRefresh}
			refreshing={props.refreshing}
			onBookmarkToggle={props.onBookmarkToggle}
			bookmarkedArticles={bookmarkedSet}
			isDarkMode={props.isDarkMode}
		/>
	);
}

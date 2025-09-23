import React, { useEffect } from 'react';

type SEOProps = {
	title?: string;
	description?: string;
	url?: string; // full canonical URL
	image?: string; // full image URL
	imageWidth?: number;
	imageHeight?: number;
	publishedAt?: string; // ISO date
	modifiedAt?: string; // ISO date
	authorName?: string;
	isArticle?: boolean;
	breadcrumbs?: Array<{ name: string; url: string }>;
	tags?: string[];
	locale?: string; // e.g. en_IN
};

const SITE_NAME = 'Yuva Update';
const SITE_URL = 'https://yuvaupdate.in';
const DEFAULT_IMAGE = `${SITE_URL}/placeholder-social.png`;
const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 630;

function ensureDocument() {
	return typeof globalThis !== 'undefined' && !!(globalThis as any).document;
}

function upsertMeta(name: string, content: string, attr = 'name') {
	if (!ensureDocument()) return;
	const selector = `[${attr}="${name}"]`;
	let el = document.head.querySelector(`meta${selector}`) as HTMLMetaElement | null;
	if (!el) {
		el = document.createElement('meta');
		(el as any)[attr] = name;
		el.setAttribute('data-seo-managed', 'true');
		document.head.appendChild(el);
	} else if (!el.hasAttribute('data-seo-managed')) {
		// Mark existing meta as managed so future runs can be less invasive
		el.setAttribute('data-seo-managed', 'true');
	}
	el.content = content;
}

function setOrUpdateLink(rel: string, href: string, attrs?: Record<string, string>) {
	if (!ensureDocument()) return;
	let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
	if (!link) {
		link = document.createElement('link');
		link.rel = rel;
		link.setAttribute('data-seo-managed', 'true');
		document.head.appendChild(link);
	} else if (!link.hasAttribute('data-seo-managed')) {
		link.setAttribute('data-seo-managed', 'true');
	}
	link.href = href;
	if (attrs) {
		Object.keys(attrs).forEach(k => link!.setAttribute(k, attrs[k]));
	}
}

function buildArticleJsonLd(props: SEOProps) {
	const { title, description, url, image, publishedAt, modifiedAt, authorName, tags } = props;
	const json: any = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		'mainEntityOfPage': {
			'@type': 'WebPage',
			'@id': url || SITE_URL,
		},
		'headline': title || SITE_NAME,
		'description': description || '',
		'image': image ? [image] : [DEFAULT_IMAGE],
		'author': {
			'@type': authorName ? 'Person' : 'Organization',
			'name': authorName || SITE_NAME,
		},
		'publisher': {
			'@type': 'Organization',
			'name': SITE_NAME,
			'logo': {
				'@type': 'ImageObject',
				'url': `${SITE_URL}/placeholder.svg`
			}
		}
	};
	if (publishedAt) json.datePublished = publishedAt;
	if (modifiedAt) json.dateModified = modifiedAt;
	if (tags && tags.length) json.keywords = tags.join(', ');
	return JSON.stringify(json);
}

function buildWebSiteJsonLd() {
	const json = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		'url': SITE_URL,
		'name': SITE_NAME,
		'publisher': {
			'@type': 'Organization',
			'name': SITE_NAME,
			'logo': {
				'@type': 'ImageObject',
				'url': `${SITE_URL}/placeholder.svg`
			}
		}
	};
	return JSON.stringify(json);
}

function buildWebPageJsonLd(props: SEOProps) {
	const { title, description, url } = props;
	const json: any = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		'url': url || SITE_URL,
		'name': title || SITE_NAME,
		'description': description || ''
	};
	return JSON.stringify(json);
}

function buildBreadcrumbJsonLd(breadcrumbs?: Array<{ name: string; url: string }>) {
	if (!breadcrumbs || breadcrumbs.length === 0) return null;
	const itemList = breadcrumbs.map((b, i) => ({
		'@type': 'ListItem',
		position: i + 1,
		name: b.name,
		item: b.url,
	}));
	const json = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: itemList,
	};
	return JSON.stringify(json);
}

export default function SEO(props: SEOProps) {
	useEffect(() => {
		if (!ensureDocument()) return;

		const { title, description, url, image, isArticle, breadcrumbs, imageWidth, imageHeight, locale } = props;

		const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
		document.title = fullTitle;

		const finalUrl = url || (globalThis.location ? `${SITE_URL}${globalThis.location.pathname}` : SITE_URL);
		const finalImage = image || DEFAULT_IMAGE;
		const finalImageWidth = imageWidth || DEFAULT_IMAGE_WIDTH;
		const finalImageHeight = imageHeight || DEFAULT_IMAGE_HEIGHT;
		const finalDescription = description || `${SITE_NAME} - Latest news and updates`;
		const finalLocale = locale || 'en_IN';

		// Basic meta
		upsertMeta('description', finalDescription);
		upsertMeta('robots', 'index,follow');

		// Open Graph
		upsertMeta('og:type', isArticle ? 'article' : 'website', 'property');
		upsertMeta('og:locale', finalLocale, 'property');
		upsertMeta('og:title', fullTitle, 'property');
		upsertMeta('og:description', finalDescription, 'property');
		upsertMeta('og:url', finalUrl, 'property');
		upsertMeta('og:image', finalImage, 'property');
		upsertMeta('og:site_name', SITE_NAME, 'property');

		// Optional image dimensions
		upsertMeta('og:image:width', String(finalImageWidth), 'property');
		upsertMeta('og:image:height', String(finalImageHeight), 'property');

		// Twitter
		upsertMeta('twitter:card', 'summary_large_image');
		upsertMeta('twitter:title', fullTitle);
		upsertMeta('twitter:description', finalDescription);
		upsertMeta('twitter:image', finalImage);

		// Canonical and hreflang/alternate
		setOrUpdateLink('canonical', finalUrl);
		// Provide basic hreflang alternates (common); do not override if already present
		setOrUpdateLink('alternate', finalUrl, { hreflang: 'x-default' });
		setOrUpdateLink('alternate', finalUrl, { hreflang: 'en' });
		setOrUpdateLink('alternate', finalUrl, { hreflang: finalLocale.replace('_', '-') });

		// Structured data handling: remove previous script if present
		const JSON_LD_ID = 'seo-json-ld';
		const existing = document.head.querySelector(`#${JSON_LD_ID}`);
		if (existing) existing.remove();

		const scripts: string[] = [];
		// Always include website and webpage JSON-LD (helps non-article pages)
		scripts.push(buildWebSiteJsonLd());
		scripts.push(buildWebPageJsonLd(props));

		if (isArticle) {
			scripts.push(buildArticleJsonLd(props));
		}
		const bc = buildBreadcrumbJsonLd(breadcrumbs);
		if (bc) scripts.push(bc);

		if (scripts.length) {
			const s = document.createElement('script');
			s.type = 'application/ld+json';
			s.id = JSON_LD_ID;
			s.setAttribute('data-seo-managed', 'true');
			s.text = scripts.length === 1 ? scripts[0] : `[${scripts.join(',')}]`;
			document.head.appendChild(s);
		}

		// cleanup on unmount: remove JSON-LD and managed link/meta tags we created
		return () => {
			try {
				const j = document.head.querySelector(`#${JSON_LD_ID}`);
				if (j) j.remove();

				// Remove link/meta elements we marked as managed
				const managed = Array.from(document.head.querySelectorAll('[data-seo-managed="true"]')) as Element[];
				managed.forEach(el => {
					// Skip removing canonical (leave canonical in place) — we only update it
					if (el.tagName.toLowerCase() === 'link' && (el as HTMLLinkElement).rel === 'canonical') return;
					// Keep og and twitter if they existed before (we marked them but won't delete them on unmount to avoid surprises).
					// So only remove JSON-LD and alternate links we added in this run.
					if (el.tagName.toLowerCase() === 'script') {
						el.remove();
					}
				});
			} catch (e) {
				// ignore
			}
		};
	}, [props.title, props.description, props.url, props.image, props.imageWidth, props.imageHeight, props.isArticle, props.publishedAt, props.modifiedAt, props.authorName, JSON.stringify(props.breadcrumbs || []), JSON.stringify(props.tags || []), props.locale]);

	return null;
}

// Helper: pre-build breadcrumbs for category pages
export function categoryBreadcrumbs(categorySlug: string, categoryName: string) {
	return [
		{ name: 'Home', url: SITE_URL },
		{ name: categoryName, url: `${SITE_URL}/category/${categorySlug}/` },
	];
}

 
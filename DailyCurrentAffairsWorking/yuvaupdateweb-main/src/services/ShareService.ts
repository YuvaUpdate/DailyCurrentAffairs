/**
 * Share Service for Web Articles
 * Provides sharing functionality across different platforms and methods
 */
export class ShareService {
  
  /**
   * Check if native Web Share API is supported
   */
  static isNativeShareSupported(): boolean {
    return 'share' in navigator;
  }

  /**
   * Share article using native Web Share API
   */
  static async shareNative(article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  }): Promise<boolean> {
    if (!this.isNativeShareSupported()) {
      return false;
    }

    try {
      const shareData = {
        title: article.title,
        text: `${article.category ? `${article.category}: ` : ''}${article.title}\n\n${article.summary.substring(0, 200)}${article.summary.length > 200 ? '...' : ''}`,
        url: article.sourceUrl,
      };

      await navigator.share(shareData);
      console.log('📤 Article shared successfully via native share');
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('📤 Native share failed:', error);
      }
      return false;
    }
  }

  /**
   * Copy article link to clipboard
   */
  static async copyToClipboard(article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  }): Promise<boolean> {
    try {
      const shareText = `${article.title}\n\n${article.summary.substring(0, 150)}${article.summary.length > 150 ? '...' : ''}\n\n🔗 Read more: ${article.sourceUrl}`;
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      console.log('📋 Article copied to clipboard');
      return true;
    } catch (error) {
      console.error('📋 Copy to clipboard failed:', error);
      return false;
    }
  }

  /**
   * Share to WhatsApp
   */
  static shareToWhatsApp(article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  }): void {
    const text = encodeURIComponent(
      `*${article.title}*\n\n${article.summary.substring(0, 200)}${article.summary.length > 200 ? '...' : ''}\n\n🔗 ${article.sourceUrl}`
    );
    const url = `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    console.log('📤 Sharing to WhatsApp');
  }

  /**
   * Share to Twitter/X
   */
  static shareToTwitter(article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  }): void {
    const text = encodeURIComponent(
      `${article.title}\n\n${article.summary.substring(0, 120)}${article.summary.length > 120 ? '...' : ''}`
    );
    const url = encodeURIComponent(article.sourceUrl);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    console.log('📤 Sharing to Twitter');
  }

  /**
   * Share to Facebook
   */
  static shareToFacebook(article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  }): void {
    const url = encodeURIComponent(article.sourceUrl);
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
    console.log('📤 Sharing to Facebook');
  }

  /**
   * Share to LinkedIn
   */
  static shareToLinkedIn(article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  }): void {
    const url = encodeURIComponent(article.sourceUrl);
    const title = encodeURIComponent(article.title);
    const summary = encodeURIComponent(article.summary.substring(0, 200));
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${summary}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
    console.log('📤 Sharing to LinkedIn');
  }

  /**
   * Share to Telegram
   */
  static shareToTelegram(article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  }): void {
    const text = encodeURIComponent(
      `*${article.title}*\n\n${article.summary.substring(0, 200)}${article.summary.length > 200 ? '...' : ''}\n\n🔗 ${article.sourceUrl}`
    );
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(article.sourceUrl)}&text=${text}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    console.log('📤 Sharing to Telegram');
  }

  /**
   * Share via email
   */
  static shareViaEmail(article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  }): void {
    const subject = encodeURIComponent(`News: ${article.title}`);
    const body = encodeURIComponent(
      `${article.title}\n\n${article.summary}\n\nRead the full article here:\n${article.sourceUrl}\n\n---\nShared via YuvaUpdate News`
    );
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = emailUrl;
    console.log('📤 Sharing via email');
  }

  /**
   * Smart share - tries native first, then fallback to options
   */
  static async smartShare(article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  }): Promise<'native' | 'fallback'> {
    // Try native share first
    const nativeSuccess = await this.shareNative(article);
    if (nativeSuccess) {
      return 'native';
    }

    // Fallback to copy to clipboard
    const copySuccess = await this.copyToClipboard(article);
    if (copySuccess) {
      return 'fallback';
    }

    // If all else fails, open share menu manually
    return 'fallback';
  }

  /**
   * Get share options for manual sharing
   */
  static getShareOptions(): Array<{
    name: string;
    icon: string;
    action: (article: any) => void;
    color: string;
  }> {
    return [
      {
        name: 'Copy Link',
        icon: '📋',
        action: this.copyToClipboard,
        color: '#6b7280'
      },
      {
        name: 'WhatsApp',
        icon: '💬',
        action: this.shareToWhatsApp,
        color: '#25d366'
      },
      {
        name: 'Twitter',
        icon: '🐦',
        action: this.shareToTwitter,
        color: '#1da1f2'
      },
      {
        name: 'Facebook',
        icon: '📘',
        action: this.shareToFacebook,
        color: '#1877f2'
      },
      {
        name: 'LinkedIn',
        icon: '💼',
        action: this.shareToLinkedIn,
        color: '#0077b5'
      },
      {
        name: 'Telegram',
        icon: '✈️',
        action: this.shareToTelegram,
        color: '#0088cc'
      },
      {
        name: 'Email',
        icon: '📧',
        action: this.shareViaEmail,
        color: '#ea4335'
      }
    ];
  }
}

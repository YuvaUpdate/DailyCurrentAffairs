import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { NewsArticle } from '../types';

export class SharingService {
  static async shareArticle(article: NewsArticle): Promise<void> {
    try {
      const shareContent = `${article.title}\n\n${article.description}\n\nRead more: ${article.url}\n\nShared via Daily Current Affairs`;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareContent, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Article',
        });
      } else {
        // Fallback to clipboard if sharing is not available
        await this.copyToClipboard(shareContent);
        alert('Article copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing article:', error);
      throw error;
    }
  }

  static async shareArticleUrl(article: NewsArticle): Promise<void> {
    try {
      const shareContent = `Check out this news: ${article.title}\n${article.url}`;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareContent, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Article Link',
        });
      } else {
        await this.copyToClipboard(shareContent);
        alert('Article link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing article URL:', error);
      throw error;
    }
  }

  static async copyToClipboard(text: string): Promise<void> {
    try {
      await Clipboard.setStringAsync(text);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      throw error;
    }
  }

  static async copyArticleToClipboard(article: NewsArticle): Promise<void> {
    try {
      const content = `${article.title}\n\n${article.description}\n\nRead more: ${article.url}`;
      await this.copyToClipboard(content);
    } catch (error) {
      console.error('Error copying article to clipboard:', error);
      throw error;
    }
  }

  // Share via WhatsApp (opens WhatsApp with pre-filled message)
  static async shareToWhatsApp(article: NewsArticle): Promise<void> {
    try {
      const message = encodeURIComponent(`${article.title}\n\n${article.description}\n\nRead more: ${article.url}`);
      const whatsappUrl = `whatsapp://send?text=${message}`;
      
      // Note: This would require additional setup for deep linking
      // For now, we'll use the regular share functionality
      await this.shareArticle(article);
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
      throw error;
    }
  }

  static async shareImage(imageUri: string, title: string): Promise<void> {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/jpeg',
          dialogTitle: title,
        });
      } else {
        alert('Image sharing not available on this device');
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      throw error;
    }
  }

  static isShareAvailable(): Promise<boolean> {
    return Sharing.isAvailableAsync();
  }
}

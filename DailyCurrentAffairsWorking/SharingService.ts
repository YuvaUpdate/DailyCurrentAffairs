import { Share, Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { NewsArticle } from './types';

export interface ShareOptions {
  title?: string;
  message?: string;
  url?: string;
  imageUrl?: string;
}

export interface SharePlatform {
  name: string;
  id: string;
  color: string;
  icon: string;
}

class SharingService {
  // Available sharing platforms
  private readonly platforms: SharePlatform[] = [
    {
      name: 'WhatsApp',
      id: 'whatsapp',
      color: '#25D366',
      icon: 'logo-whatsapp'
    },
    {
      name: 'Facebook',
      id: 'facebook',
      color: '#1877F2',
      icon: 'logo-facebook'
    },
    {
      name: 'Twitter',
      id: 'twitter',
      color: '#1DA1F2',
      icon: 'logo-twitter'
    },
    {
      name: 'LinkedIn',
      id: 'linkedin',
      color: '#0A66C2',
      icon: 'logo-linkedin'
    },
    {
      name: 'Telegram',
      id: 'telegram',
      color: '#0088CC',
      icon: 'paper-plane'
    },
    {
      name: 'Email',
      id: 'email',
      color: '#EA4335',
      icon: 'mail'
    },
    {
      name: 'SMS',
      id: 'sms',
      color: '#34C759',
      icon: 'chatbubble'
    },
    {
      name: 'Copy Link',
      id: 'copy',
      color: '#007AFF',
      icon: 'copy'
    }
  ];

  // Share article using native share dialog
  async shareArticle(article: NewsArticle): Promise<boolean> {
    try {
      const shareOptions: ShareOptions = {
        title: article.headline,
        message: `${article.headline}\n\n${article.description}\n\nRead more on YuvaUpdate`,
        url: article.imageUrl || ''
      };

      const result = await Share.share({
        title: shareOptions.title || '',
        message: shareOptions.message || '',
        url: Platform.OS === 'ios' ? shareOptions.url : undefined
      });

      if (result.action === Share.sharedAction) {
        console.log('✅ Article shared successfully');
        return true;
      } else if (result.action === Share.dismissedAction) {
        console.log('ℹ️ Share dialog dismissed');
        return false;
      }

      return false;
    } catch (error) {
      console.error('❌ Error sharing article:', error);
      Alert.alert('Error', 'Failed to share article. Please try again.');
      return false;
    }
  }

  // Share to specific platform
  async shareToSpecificPlatform(article: NewsArticle, platformId: string): Promise<boolean> {
    try {
      const platform = this.platforms.find(p => p.id === platformId);
      if (!platform) {
        throw new Error(`Platform ${platformId} not supported`);
      }

      const shareText = `${article.headline}\n\n${article.description}`;
      const shareUrl = article.imageUrl || '';
      const appUrl = 'https://yuvaupdateapp.com'; // Your app's URL

      let deepLinkUrl = '';

      switch (platformId) {
        case 'whatsapp':
          deepLinkUrl = `whatsapp://send?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
          break;

        case 'facebook':
          deepLinkUrl = `fb://facewebmodal/f?href=${encodeURIComponent(shareUrl)}`;
          break;

        case 'twitter':
          const twitterText = shareText.length > 200 ? shareText.substring(0, 197) + '...' : shareText;
          deepLinkUrl = `twitter://post?message=${encodeURIComponent(`${twitterText}\n\n${shareUrl}`)}`;
          break;

        case 'linkedin':
          deepLinkUrl = `linkedin://sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
          break;

        case 'telegram':
          deepLinkUrl = `tg://msg?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
          break;

        case 'email':
          const emailSubject = encodeURIComponent(article.headline);
          const emailBody = encodeURIComponent(`${shareText}\n\nRead more: ${shareUrl}\n\nShared via YuvaUpdate App`);
          deepLinkUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;
          break;

        case 'sms':
          const smsText = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
          deepLinkUrl = Platform.OS === 'ios' 
            ? `sms:&body=${smsText}`
            : `sms:?body=${smsText}`;
          break;

        case 'copy':
          return await this.copyToClipboard(article);

        default:
          throw new Error(`Platform ${platformId} not implemented`);
      }

      // Try to open the app-specific URL
      const canOpen = await Linking.canOpenURL(deepLinkUrl);
      if (canOpen) {
        await Linking.openURL(deepLinkUrl);
        console.log(`✅ Shared to ${platform.name} successfully`);
        return true;
      } else {
        // Fallback to web URL if app is not installed
        return await this.shareToWebPlatform(article, platformId);
      }
    } catch (error) {
      console.error(`❌ Error sharing to ${platformId}:`, error);
      
      // Fallback to native share
      Alert.alert(
        'App Not Found',
        `${platformId} app is not installed. Would you like to use the general share dialog?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Share', 
            onPress: () => this.shareArticle(article)
          }
        ]
      );
      return false;
    }
  }

  // Share to web platform (fallback)
  private async shareToWebPlatform(article: NewsArticle, platformId: string): Promise<boolean> {
    try {
      const shareText = encodeURIComponent(`${article.headline}\n\n${article.description}`);
      const shareUrl = encodeURIComponent(article.imageUrl || '');
      let webUrl = '';

      switch (platformId) {
        case 'facebook':
          webUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;
          break;

        case 'twitter':
          webUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
          break;

        case 'linkedin':
          webUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;
          break;

        case 'telegram':
          webUrl = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
          break;

        default:
          return await this.shareArticle(article);
      }

      const canOpen = await Linking.canOpenURL(webUrl);
      if (canOpen) {
        await Linking.openURL(webUrl);
        console.log(`✅ Shared to ${platformId} web successfully`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error sharing to ${platformId} web:`, error);
      return false;
    }
  }

  // Copy article to clipboard
  private async copyToClipboard(article: NewsArticle): Promise<boolean> {
    try {
      const Clipboard = await import('expo-clipboard');
      const textToCopy = `${article.headline}\n\n${article.description}\n\n${article.imageUrl || ''}\n\nShared via YuvaUpdate App`;
      
      await Clipboard.setStringAsync(textToCopy);
      
      Alert.alert('Copied!', 'Article link copied to clipboard');
      console.log('✅ Article copied to clipboard');
      return true;
    } catch (error) {
      console.error('❌ Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
      return false;
    }
  }

  // Generate shareable link for article
  generateShareableLink(article: NewsArticle): string {
    const baseUrl = 'https://yuvaupdateapp.com/article';
    const articleId = this.generateArticleId(article);
    return `${baseUrl}/${articleId}`;
  }

  // Generate article ID from headline
  private generateArticleId(article: NewsArticle): string {
    return article.headline
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  // Get available sharing platforms
  getSharingPlatforms(): SharePlatform[] {
    return [...this.platforms];
  }

  // Check if platform is available
  async isPlatformAvailable(platformId: string): Promise<boolean> {
    try {
      const platform = this.platforms.find(p => p.id === platformId);
      if (!platform) return false;

      if (platformId === 'copy' || platformId === 'email' || platformId === 'sms') {
        return true; // Always available
      }

      // Check if app is installed
      let checkUrl = '';
      switch (platformId) {
        case 'whatsapp':
          checkUrl = 'whatsapp://';
          break;
        case 'facebook':
          checkUrl = 'fb://';
          break;
        case 'twitter':
          checkUrl = 'twitter://';
          break;
        case 'linkedin':
          checkUrl = 'linkedin://';
          break;
        case 'telegram':
          checkUrl = 'tg://';
          break;
        default:
          return false;
      }

      return await Linking.canOpenURL(checkUrl);
    } catch (error) {
      console.error(`❌ Error checking platform availability for ${platformId}:`, error);
      return false;
    }
  }

  // Create share content for social media
  createShareContent(article: NewsArticle, platform: string): ShareOptions {
    const baseContent = {
      title: article.headline,
      message: article.description,
      url: article.imageUrl || this.generateShareableLink(article),
      imageUrl: article.image
    };

    switch (platform) {
      case 'twitter':
        // Twitter has character limits
        const maxLength = 240;
        let twitterMessage = `${baseContent.title}\n\n${baseContent.message}`;
        if (twitterMessage.length > maxLength - 30) { // Reserve space for URL
          twitterMessage = twitterMessage.substring(0, maxLength - 33) + '...';
        }
        return {
          ...baseContent,
          message: twitterMessage
        };

      case 'linkedin':
        return {
          ...baseContent,
          message: `${baseContent.title}\n\n${baseContent.message}\n\n#YuvaUpdate #CurrentAffairs #News`
        };

      case 'facebook':
        return {
          ...baseContent,
          message: `${baseContent.title}\n\n${baseContent.message}\n\nStay updated with YuvaUpdate! 📰`
        };

      default:
        return baseContent;
    }
  }
}

export const sharingService = new SharingService();

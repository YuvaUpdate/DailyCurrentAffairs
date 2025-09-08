import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Share2, X, Copy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadAloudService } from '@/services/ReadAloudService';
import { ShareService } from '@/services/ShareService';

interface ArticleActionsProps {
  article: {
    title: string;
    summary: string;
    sourceUrl: string;
    category?: string;
  };
  className?: string;
}

export function ArticleActions({ article, className = '' }: ArticleActionsProps) {
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    setIsSupported(ReadAloudService.isSupported());
    
    // Check status periodically
    const interval = setInterval(() => {
      const status = ReadAloudService.getStatus();
      setIsReading(status.isReading);
      setIsPaused(status.isPaused);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleReadAloud = async () => {
    if (!isSupported) {
      alert('Text-to-speech is not supported in your browser');
      return;
    }

    try {
      if (isReading) {
        if (isPaused) {
          ReadAloudService.resume();
        } else {
          ReadAloudService.pause();
        }
      } else {
        await ReadAloudService.readArticle(article);
      }
    } catch (error) {
      console.error('Read aloud error:', error);
      alert('Failed to start reading. Please try again.');
    }
  };

  const handleStopReading = () => {
    ReadAloudService.stop();
  };

  const handleShare = async () => {
    const result = await ShareService.smartShare(article);
    
    if (result === 'fallback') {
      setShowShareMenu(true);
    }
  };

  const handleShareOption = async (action: (article: any) => void | Promise<boolean>, name: string) => {
    try {
      const result = await action(article);
      if (result === false) {
        setShareMessage(`Failed to share via ${name}`);
      } else {
        setShareMessage(`Shared via ${name}!`);
      }
    } catch (error) {
      setShareMessage(`Failed to share via ${name}`);
    }
    
    setShowShareMenu(false);
    
    if (shareMessage) {
      setTimeout(() => setShareMessage(''), 2000);
    }
  };

  const shareOptions = ShareService.getShareOptions();

  return (
    <>
      {/* Main Action Buttons */}
      <div className={`flex gap-2 ${className}`}>
        {/* Read Aloud Button */}
        {isSupported && (
          <div className="flex gap-1 flex-col sm:flex-row">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReadAloud}
              className={`${
                isReading 
                  ? (isPaused ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' : 'bg-green-100 hover:bg-green-200 text-green-800')
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
              } border border-current transition-all duration-200 shadow-lg backdrop-blur-sm bg-opacity-90`}
              title={isReading ? (isPaused ? 'Resume reading' : 'Pause reading') : 'Read aloud'}
            >
              {isReading ? (
                isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span className="ml-1 hidden lg:inline text-xs">
                {isReading ? (isPaused ? 'Resume' : 'Pause') : 'Read'}
              </span>
            </Button>
            
            {isReading && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStopReading}
                className="bg-red-100 hover:bg-red-200 text-red-800 border border-current shadow-lg backdrop-blur-sm bg-opacity-90"
                title="Stop reading"
              >
                <VolumeX className="w-4 h-4" />
                <span className="ml-1 hidden lg:inline text-xs">Stop</span>
              </Button>
            )}
          </div>
        )}

        {/* Share Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleShare}
          className="bg-purple-100 hover:bg-purple-200 text-purple-800 border border-current transition-all duration-200 shadow-lg backdrop-blur-sm bg-opacity-90"
          title="Share article"
        >
          <Share2 className="w-4 h-4" />
          <span className="ml-1 hidden lg:inline text-xs">Share</span>
        </Button>
      </div>

      {/* Share Message */}
      {shareMessage && (
        <div className="fixed top-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          {shareMessage}
        </div>
      )}

      {/* Share Menu Modal */}
      {showShareMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Share Article</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareMenu(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              {shareOptions.map((option) => (
                <Button
                  key={option.name}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleShareOption(option.action, option.name)}
                >
                  <span className="mr-3 text-lg">{option.icon}</span>
                  <span>{option.name}</span>
                </Button>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                {article.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {article.summary.substring(0, 100)}...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

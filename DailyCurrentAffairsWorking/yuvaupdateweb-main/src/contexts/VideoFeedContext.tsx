import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VideoFeedContextType {
  isVideoFeedOpen: boolean;
  openVideoFeed: () => void;
  closeVideoFeed: () => void;
}

const VideoFeedContext = createContext<VideoFeedContextType | undefined>(undefined);

export const useVideoFeed = () => {
  const context = useContext(VideoFeedContext);
  if (context === undefined) {
    throw new Error('useVideoFeed must be used within a VideoFeedProvider');
  }
  return context;
};

interface VideoFeedProviderProps {
  children: ReactNode;
}

export const VideoFeedProvider: React.FC<VideoFeedProviderProps> = ({ children }) => {
  const [isVideoFeedOpen, setIsVideoFeedOpen] = useState(false);

  const openVideoFeed = () => {
    console.log('Opening video feed...');
    setIsVideoFeedOpen(true);
  };
  
  const closeVideoFeed = () => {
    console.log('Closing video feed...');
    setIsVideoFeedOpen(false);
  };

  return (
    <VideoFeedContext.Provider value={{ isVideoFeedOpen, openVideoFeed, closeVideoFeed }}>
      {children}
    </VideoFeedContext.Provider>
  );
};
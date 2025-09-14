import { Menu, Play } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { VideoFeed } from "@/components/video/VideoFeed";
import { useVideoFeed } from "@/contexts/VideoFeedContext";

export function Header() {
  const { isVideoFeedOpen, openVideoFeed, closeVideoFeed } = useVideoFeed();

  return (
    <>
      <header className="h-header bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="interactive" />
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-card overflow-hidden border border-border">
                <img src="/favicon.png" alt="YuvaUpdate Logo" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <h1 className="font-bold text-card-foreground">YuvaUpdate</h1>
                <p className="text-xs text-muted-foreground">Latest News & Updates</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Simple Video Link - Alternative approach */}
            <div
              onClick={() => {
                console.log('SIMPLE VIDEO CLICKED!');
                openVideoFeed();
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-4 py-2 rounded-full shadow-lg cursor-pointer select-none transition-transform duration-100 hover:scale-105"
              style={{
                pointerEvents: 'auto',
                zIndex: 1000,
                position: 'relative'
              }}
            >
              <Play className="h-4 w-4 mr-2 inline-block" />
              VIDEOS
            </div>
            
            <div className="text-xs text-muted-foreground hidden sm:block">
              Professional News Platform
            </div>
          </div>
        </div>
      </header>

      {/* Video Feed Modal */}
      {isVideoFeedOpen && (
        <VideoFeed onClose={closeVideoFeed} />
      )}
    </>
  );
}
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
            {/* Video Button */}
            <Button
              onClick={openVideoFeed}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Play className="h-4 w-4 mr-2" />
              VIDEOS
            </Button>
            
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
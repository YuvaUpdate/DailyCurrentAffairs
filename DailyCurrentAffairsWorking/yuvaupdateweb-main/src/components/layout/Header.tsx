import { Menu, Play } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { VideoFeed } from "@/components/video/VideoFeed";
import { useVideoFeed } from "@/contexts/VideoFeedContext";

export function Header() {
  const { isVideoFeedOpen, openVideoFeed, closeVideoFeed } = useVideoFeed();

  return (
    <>
  {/* Raise header above floating toasts and toggles which use very large z-index values */}
  {/* Hide the header while the video feed/modal is open so it doesn't appear inside the fullscreen video section */}
  <header
    className={`h-header bg-card border-b border-border sticky top-0 z-[10010] ${isVideoFeedOpen ? 'hidden' : ''}`}
    style={{ zIndex: 10010 }}
    aria-hidden={isVideoFeedOpen}
  >
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
            {/* Video Anchor — scrolls to the Videos section and opens the Video Feed modal */}
            <a
              href="#videos"
              onClick={(e) => {
                // Smooth scroll to the videos section if it exists, and also open the modal
                try {
                  const el = document.getElementById('videos');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch (err) {}
                try { e.preventDefault(); } catch (err) {}
                try { openVideoFeed(true); } catch (err) {}
              }}
              className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-4 py-2 rounded-full shadow-lg cursor-pointer select-none transition-transform duration-100 hover:scale-105"
              role="button"
              aria-label="Open Videos"
              style={{ pointerEvents: 'auto', zIndex: 10011, position: 'relative' }}
            >
              <Play className="h-4 w-4 mr-2 inline-block" />
              VIDEOS
            </a>

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
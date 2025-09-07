import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface WebViewModalProps {
  url: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function WebViewModal({ url, isOpen, onClose }: WebViewModalProps) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen && url) {
      setLoading(true);
      setError(false);
      setProgress(0);

      // Simulate progressive loading
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setLoading(false);
            return 100;
          }
          return prev + 10;
        });
      }, 150);

      // Fallback timeout
      const timeout = setTimeout(() => {
        clearInterval(progressInterval);
        setLoading(false);
        setProgress(100);
      }, 1500);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, url]);

  if (!url) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed inset-0 m-0 p-0 w-screen h-screen max-w-none max-h-none bg-card flex flex-col rounded-none border-none shadow-none overflow-hidden min-w-0" style={{width:'100vw',height:'100vh',minWidth:0,minHeight:0,overflow:'hidden'}}>
        {/* Close Button */}
        <div className="flex items-center justify-end p-2 bg-background w-full border-b border-border min-w-0" style={{ minHeight: '48px' }}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="interactive"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        {/* Loading Bar */}
        {loading && (
          <div className="px-4 pt-2 w-full min-w-0">
            <Progress value={progress} className="w-full" />
          </div>
        )}
        {/* WebView */}
        <div className="flex-1 relative bg-background min-h-0 w-full h-full min-w-0 overflow-hidden">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Failed to load page.</p>
            </div>
          ) : (
            <iframe
              src={url}
              className="webview-iframe w-full h-full min-h-0 min-w-0 border-0 block"
              title="Web View"
              onLoad={() => {
                setLoading(false);
                setProgress(100);
              }}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              style={{ minHeight: 0, minWidth: 0, width: '100vw', height: '100vh', overflow: 'hidden', display: 'block' }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
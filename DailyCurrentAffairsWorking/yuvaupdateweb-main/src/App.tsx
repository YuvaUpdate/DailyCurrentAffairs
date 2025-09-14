import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Index from "./pages/Index";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import { initImageOptimizations } from "@/services/ImagePreloadService";
import { WebAnalyticsService } from "@/services/WebAnalyticsService";
import { VideoFeedProvider, useVideoFeed } from "@/contexts/VideoFeedContext";

const queryClient = new QueryClient();
const AdminPageLazy = lazy(() => import("./pages/Admin"));

const AppContent = () => {
  const { isVideoFeedOpen } = useVideoFeed();
  
  useEffect(() => {
    // Initialize image optimizations when the app starts
    initImageOptimizations();
    
    // Initialize analytics tracking
    WebAnalyticsService.initializeTracking();
  }, []);
  
  return (
    <>
      <Toaster />
      <Sonner />
      {/* Theme toggle button fixed below header - hidden when video feed is open */}
      {!isVideoFeedOpen && (
        <div className="fixed top-[calc(var(--header-height)+1rem)] right-4 z-[9999] bg-card/90 backdrop-blur-md rounded-lg shadow-lg border border-border/20 p-2 hover:bg-card transition-all duration-200 sm:block hidden">
          <ThemeToggle />
        </div>
      )}
      {/* Mobile theme toggle - positioned differently for mobile */}
      {!isVideoFeedOpen && (
        <div className="fixed top-[calc(var(--header-height)+0.5rem)] right-2 z-[9999] bg-card/90 backdrop-blur-md rounded-lg shadow-lg border border-border/20 p-1.5 hover:bg-card transition-all duration-200 sm:hidden block">
          <ThemeToggle />
        </div>
      )}
      <BrowserRouter>
        {/* Removed Admin link from navigation */}
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
            <Route path="/support" element={<Support />} />
            <Route path="/admin" element={<AdminPageLazy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <VideoFeedProvider>
            <AppContent />
          </VideoFeedProvider>
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

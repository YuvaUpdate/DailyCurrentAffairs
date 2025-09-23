import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { NewsFeed } from "@/components/news/NewsFeed";
import { SidebarInset } from "@/components/ui/sidebar";
import { WebAnalyticsService } from "@/services/WebAnalyticsService";
import { useEffect } from "react";
import SEO from '@/components/SEO';

const Index = () => {
  useEffect(() => {
    // Track page view for home page
    WebAnalyticsService.trackPageView('/');
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
  <SEO description={`Latest news and updates from Yuva Update`} url={`https://yuvaupdate.in/`} />
      <AppSidebar />
      <SidebarInset>
        <Header />
        <NewsFeed />
      </SidebarInset>
    </div>
  );
};

export default Index;

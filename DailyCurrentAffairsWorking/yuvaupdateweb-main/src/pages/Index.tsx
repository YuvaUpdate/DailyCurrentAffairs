import { AppSidebar } from "@/components/layout/AppSidebar";
import { Header } from "@/components/layout/Header";
import { NewsFeed } from "@/components/news/NewsFeed";
import { SidebarInset } from "@/components/ui/sidebar";

const Index = () => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AppSidebar />
      <SidebarInset>
        <Header />
        <NewsFeed />
      </SidebarInset>
    </div>
  );
};

export default Index;

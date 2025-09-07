import { Menu } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
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
        
        <div className="text-xs text-muted-foreground hidden sm:block">
          Professional News Platform
        </div>
      </div>
    </header>
  );
}
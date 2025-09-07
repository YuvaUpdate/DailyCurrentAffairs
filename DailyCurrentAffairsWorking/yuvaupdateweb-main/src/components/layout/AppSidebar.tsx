import { FileText, HelpCircle, Info, Shield, Smartphone, Home } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Privacy Policy", url: "/privacy", icon: Shield },
  { title: "Terms of Service", url: "/terms", icon: FileText },
  { title: "About", url: "/about", icon: Info },
  { title: "Support", url: "/support", icon: HelpCircle },
];


export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleDownloadApp = () => {
    window.open('https://play.google.com/store/apps/details?id=com.yuvaupdate', '_blank');
  };

  return (
    <Sidebar 
      className="border-r border-border"
      collapsible="icon"
    >
      <SidebarContent className="bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">Y</span>
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-card-foreground">YuvaUpdate</h2>
                <p className="text-xs text-muted-foreground">Professional News</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">
            {!collapsed ? "Navigation" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        }`
                      }
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-border">
          <Button 
            onClick={handleDownloadApp}
            className="w-full interactive flex items-center gap-2"
            variant="default"
            size="default"
          >
            <Smartphone className="w-4 h-4" />
            {!collapsed && <span>Download App</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
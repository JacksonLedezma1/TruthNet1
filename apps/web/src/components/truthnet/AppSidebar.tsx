import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, PlusCircle, History, Settings, LogOut } from "lucide-react";
import { useAuthMutations } from "@/hooks/useAuthMutations";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Nuevo análisis", url: "/analysis/new", icon: PlusCircle },
  { title: "Historial", url: "/history", icon: History },
  { title: "Configuración", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { logoutMutation } = useAuthMutations();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="bg-card">
        <div className="p-4 border-b border-border">
          <span className="text-lg font-bold tracking-tight">
            {collapsed ? "T" : <>Truth<span className="text-primary">Net</span></>}
          </span>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/dashboard"} className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-border">
          <button 
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>{logoutMutation.isPending ? "Saliendo..." : "Cerrar sesión"}</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

import { useState, useEffect, createContext, useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Brain } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { 
  Waves, 
  MapPin, 
  BarChart3, 
  Shield, 
  Settings, 
  AlertTriangle,
  Users,
  Database
} from 'lucide-react';

const navigationItems = [
  { title: 'Dashboard', url: '/', icon: BarChart3, roles: ['citizen', 'analyst', 'disaster_manager'] },
  { title: 'Report Hazard', url: '/report', icon: AlertTriangle, roles: ['citizen', 'analyst', 'disaster_manager'] },
  { title: 'Map View', url: '/map', icon: MapPin, roles: ['citizen', 'analyst', 'disaster_manager'] },
  { title: 'Social Media', url: '/social', icon: Database, roles: ['analyst', 'disaster_manager'] },
  { title: 'Disaster Center', url: '/disaster', icon: Shield, roles: ['disaster_manager', 'analyst'] },
  { title: 'Admin Panel', url: '/admin', icon: Shield, roles: ['analyst', 'disaster_manager'] },
  { title: 'AI Predictions', url: '/ai-predictions', icon: Brain, roles: ['analyst', 'disaster_manager'] },
];

export function AppSidebar() {
  const { profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavClasses = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-r-2 border-primary" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";

  const filteredItems = navigationItems.filter(item => 
    profile?.role && item.roles.includes(profile.role)
  );

  return (
    <Sidebar className="w-64 border-r border-sidebar-border bg-sidebar">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Waves className="h-8 w-8 text-primary" />
              <Shield className="h-4 w-4 text-accent absolute -top-1 -right-1" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-sidebar-foreground">Jalvaarta</h2>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {profile?.role?.replace('_', ' ')} Portal
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClasses}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="ml-3">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Info */}
        {profile && (
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile.name}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {profile.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
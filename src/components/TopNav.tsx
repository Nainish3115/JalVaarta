import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Settings, Bell } from 'lucide-react';
import { useEffect } from 'react';

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google?: any;
  }
}

export function TopNav() {
  const { profile, signOut } = useAuth();

  useEffect(() => {
    // Load Google Translate script
    const script = document.createElement("script");
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);

    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'hi,bn,ta,te,mr,ur,gu,kn,ml,pa,or,as',
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
      }, 'google_translate_element');
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center space-x-4">
        <SidebarTrigger className="h-8 w-8" />
        <div className="hidden md:block">
          <h1 className="text-lg font-semibold text-foreground">
            JalVaarta
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Google Translate Language Selector */}
        <div
          id="google_translate_element"
          className="mr-2"
          style={{
            minWidth: 120,
            maxWidth: 160,
            fontSize: '0.95rem',
            background: 'var(--card)',
            borderRadius: '0.375rem',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}
        />
        <style>
          {`
            #google_translate_element .goog-te-gadget {
              font-family: inherit !important;
              font-size: 0.95rem !important;
              color: var(--foreground) !important;
              background: var(--card) !important;
              margin: 0 !important;
              padding: 0 !important;
              border-radius: 0.375rem !important;
              border: 1px solid var(--border) !important;
            }
            #google_translate_element .goog-te-combo {
              background: var(--card) !important;
              color: var(--foreground) !important;
              border-radius: 0.375rem !important;
              border: 1px solid var(--border) !important;
              padding: 2px 8px !important;
              font-size: 0.95rem !important;
              margin: 0 !important;
            }
            #google_translate_element img {
              display: none !important;
            }
            .goog-logo-link, .goog-te-banner-frame {
              display: none !important;
            }
          `}
        </style>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.name ? getInitials(profile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover border border-border" align="end" forceMount>
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">{profile?.name}</p>
              <p className="text-xs leading-none text-muted-foreground capitalize">
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
import React from 'react';
import { Phone, LifeBuoy } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t mt-8 py-4 bg-muted/40">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between px-4 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <LifeBuoy className="h-4 w-4" />
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          <Phone className="h-4 w-4" />
          <span>Helpline: +1-800-123-4567</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  isPrimary?: boolean;
}

export function QuickActionCard({ to, icon: Icon, title, subtitle, isPrimary = false }: QuickActionCardProps) {
  return (
    <Link to={to}>
      <Card className={`hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer ${isPrimary ? 'bg-primary/10 border-primary/20' : ''}`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPrimary ? 'bg-primary/20' : 'bg-muted'}`}>
            <Icon className={`h-6 w-6 ${isPrimary ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

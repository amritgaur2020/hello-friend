import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  userId: z.string().min(3, 'User ID must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface AdminLoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (email: string, password: string) => Promise<{ error: Error | null }>;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

export function AdminLoginModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isSubmitting, 
  setIsSubmitting 
}: AdminLoginModalProps) {
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const toInternalEmail = (userId: string) => `${userId.toLowerCase().trim()}@hotel.local`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validation = loginSchema.safeParse({ userId, password });
      if (!validation.success) {
        toast({
          title: 'Validation Error',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      const internalEmail = toInternalEmail(userId);
      const { error } = await onSubmit(internalEmail, password);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: 'Invalid Admin ID or Password. Please check your credentials.',
          variant: 'destructive',
        });
      } else {
        onOpenChange(false);
        toast({
          title: 'Welcome, Admin!',
          description: 'You have full access to the system.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Admin Login</DialogTitle>
          <DialogDescription>
            Secure administrator access portal
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="admin-userid">Admin User ID</Label>
            <Input
              id="admin-userid"
              type="text"
              placeholder="Enter admin user ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Authenticating...' : 'Access Admin Panel'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

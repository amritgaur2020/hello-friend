import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  userId: z.string().min(3, 'User ID must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<{ error: Error | null }>;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

export function LoginForm({ onSubmit, isSubmitting, setIsSubmitting }: LoginFormProps) {
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
          description: 'Invalid User ID or Password. Please check your credentials.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Welcome!',
          description: 'You have successfully logged in.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-userid">User ID</Label>
        <Input
          id="login-userid"
          type="text"
          placeholder="Enter your User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          autoComplete="username"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
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
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}

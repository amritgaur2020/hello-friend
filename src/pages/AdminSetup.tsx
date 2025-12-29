import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Hotel, Eye, EyeOff, Shield, CheckCircle } from 'lucide-react';
import { z } from 'zod';

// Helper to convert user ID to internal email format
const toInternalEmail = (userId: string) => `${userId.toLowerCase().trim()}@hotel.local`;

const setupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  userId: z.string().min(3, 'User ID must be at least 3 characters').max(50).regex(/^[a-zA-Z0-9_]+$/, 'User ID can only contain letters, numbers, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function AdminSetup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  // Check if admin already exists using security definer function
  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const { data, error } = await supabase.rpc('check_admin_exists');
        
        if (!error && data === true) {
          setAdminExists(true);
        }
      } catch (err) {
        console.error('Error checking admin:', err);
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminExists();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validation = setupSchema.safeParse({ fullName, userId, password });
      if (!validation.success) {
        toast({
          title: 'Validation Error',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      // Create admin account with internal email format
      const internalEmail = toInternalEmail(userId);
      
      const { data, error } = await supabase.auth.signUp({
        email: internalEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            user_id: userId,
          },
        },
      });

      if (error) {
        toast({
          title: 'Setup Failed',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Create admin role
      if (data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: 'admin',
          });

        if (roleError) {
          toast({
            title: 'Role Assignment Failed',
            description: roleError.message,
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Admin Account Created!',
        description: `Your User ID is: ${userId}. You can now login.`,
      });
      
      navigate('/auth');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
        <div className="w-full max-w-md animate-fade-in">
          <Card className="shadow-elevated border-0 text-center">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold mb-2">System Already Configured</h2>
              <p className="text-muted-foreground mb-6">
                An admin account has already been set up. Please login to continue.
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/25">
            <Hotel className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Initial Setup</h1>
          <p className="text-muted-foreground text-sm mt-1">Create your admin account</p>
        </div>

        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Admin Registration</CardTitle>
            <CardDescription>
              This is a one-time setup. Create the main admin account.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input
                  id="user-id"
                  type="text"
                  placeholder="Create a unique User ID (e.g., admin)"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, and underscores only. This will be your login ID.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
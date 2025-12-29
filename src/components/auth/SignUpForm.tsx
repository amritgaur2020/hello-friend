import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { AppRole } from '@/types/database';

const signUpSchema = z.object({
  userId: z.string().min(3, 'User ID must be at least 3 characters').max(50, 'User ID must be less than 50 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be less than 100 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.string().min(1, 'Please select a role'),
  adminCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface SignUpFormProps {
  onSubmit: (email: string, password: string, fullName: string, role: AppRole, secretCode?: string) => Promise<{ error: Error | null }>;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess: () => void;
}

const AVAILABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'bar_tender', label: 'Bar Tender' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Administrator' },
];

export function SignUpForm({ onSubmit, isSubmitting, setIsSubmitting, onSuccess }: SignUpFormProps) {
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<AppRole | ''>('');
  const [adminCode, setAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const toInternalEmail = (userId: string) => `${userId.toLowerCase().trim()}@hotel.local`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validation = signUpSchema.safeParse({ 
        userId, 
        fullName, 
        password, 
        confirmPassword, 
        role,
        adminCode: role === 'admin' ? adminCode : undefined 
      });
      
      if (!validation.success) {
        toast({
          title: 'Validation Error',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      if (role === 'admin' && !adminCode) {
        toast({
          title: 'Admin Code Required',
          description: 'Please enter the admin secret code to register as an administrator.',
          variant: 'destructive',
        });
        return;
      }

      const internalEmail = toInternalEmail(userId);
      const { error } = await onSubmit(
        internalEmail, 
        password, 
        fullName, 
        role as AppRole, 
        role === 'admin' ? adminCode : undefined
      );
      
      if (error) {
        toast({
          title: 'Registration Failed',
          description: error.message || 'Could not create account. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account Created!',
          description: 'Your account has been created successfully. You can now sign in.',
        });
        onSuccess();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signup-fullname">Full Name</Label>
        <Input
          id="signup-fullname"
          type="text"
          placeholder="Enter your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-userid">User ID</Label>
        <Input
          id="signup-userid"
          type="text"
          placeholder="Choose a User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          autoComplete="username"
        />
        <p className="text-xs text-muted-foreground">This will be your login username</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-role">Role</Label>
        <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
          <SelectTrigger id="signup-role">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {role === 'admin' && (
        <div className="space-y-2">
          <Label htmlFor="signup-admincode">Admin Secret Code</Label>
          <Input
            id="signup-admincode"
            type="password"
            placeholder="Enter admin secret code"
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            required
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">Contact system administrator for the code</p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
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

      <div className="space-y-2">
        <Label htmlFor="signup-confirm">Confirm Password</Label>
        <Input
          id="signup-confirm"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  );
}

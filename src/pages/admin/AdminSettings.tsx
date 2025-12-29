import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Hotel, Save, Receipt, Shield, Key, Eye, EyeOff } from 'lucide-react';
import { TaxSetting, Department } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { useHotelSettings } from '@/hooks/useHotelSettings';

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const { settings, refreshSettings } = useHotelSettings();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [taxes, setTaxes] = useState<TaxSetting[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Hotel settings form
  const [hotelName, setHotelName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');

  // Password change form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (settings) {
      setHotelName(settings.hotel_name || '');
      setTagline(settings.tagline || '');
      setAddress(settings.address || '');
      setCity(settings.city || '');
      setState(settings.state || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setCurrency(settings.currency_symbol || '₹');
      setGstNumber(settings.gst_number || '');
      setPanNumber(settings.pan_number || '');
      setFssaiNumber((settings as any).fssai_number || '');
    }
    fetchData();
  }, [settings]);

  const fetchData = async () => {
    const [taxRes, deptRes] = await Promise.all([
      supabase.from('tax_settings').select('*'),
      supabase.from('departments').select('*'),
    ]);
    if (taxRes.data) setTaxes(taxRes.data as TaxSetting[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('hotel_settings').update({
        hotel_name: hotelName,
        tagline,
        address,
        city,
        state,
        phone,
        email,
        currency_symbol: currency,
        gst_number: gstNumber,
        pan_number: panNumber,
        fssai_number: fssaiNumber,
        updated_at: new Date().toISOString(),
      } as any).eq('id', settings?.id);

      if (error) throw error;
      toast({ title: 'Settings Saved!' });
      refreshSettings();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'New password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully.',
      });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!isAdmin) {
    return <DashboardLayout title="Access Denied"><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Admin access required.</p></div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="Admin Settings" subtitle="Configure hotel settings">
      <Tabs defaultValue="hotel" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hotel" className="gap-2"><Hotel className="h-4 w-4" />Hotel</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2"><Receipt className="h-4 w-4" />Billing</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="hotel">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Hotel Information</CardTitle>
              <CardDescription>Basic hotel details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hotel Name</Label>
                  <Input value={hotelName} onChange={(e) => setHotelName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="e.g., 27AABCU9603R1ZM" />
                </div>
                <div className="space-y-2">
                  <Label>PAN Number</Label>
                  <Input value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="e.g., AABCU9603R" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>FSSAI License No</Label>
                <Input value={fssaiNumber} onChange={(e) => setFssaiNumber(e.target.value)} placeholder="e.g., 12345678901234" />
              </div>
              <Button onClick={handleSaveSettings} disabled={loading} className="gap-2">
                <Save className="h-4 w-4" />{loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Invoice and payment configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency Symbol</Label>
                  <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Tax Settings</h4>
                {taxes.map(tax => (
                  <div key={tax.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-2">
                    <span>{tax.name}</span>
                    <span className="font-medium">{tax.percentage}%</span>
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveSettings} disabled={loading} className="gap-2">
                <Save className="h-4 w-4" />{loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" disabled={changingPassword} className="gap-2">
                  <Key className="h-4 w-4" />
                  {changingPassword ? 'Changing Password...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Receipt } from 'lucide-react';

interface TaxSetting {
  id: string;
  name: string;
  description: string | null;
  percentage: number;
  applies_to: string[] | null;
  is_active: boolean;
  created_at: string;
}

const APPLICABLE_CATEGORIES = [
  { key: 'room_charges', label: 'Room Charges' },
  { key: 'food_beverage', label: 'Food & Beverage' },
  { key: 'services', label: 'Services' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'laundry', label: 'Laundry' },
  { key: 'spa', label: 'Spa & Wellness' },
  { key: 'parking', label: 'Parking' },
  { key: 'others', label: 'Others' },
];

export default function TaxSettings() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxSetting | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    percentage: '',
    applies_to: [] as string[],
    is_active: true,
  });

  const { data: taxes = [], isLoading } = useQuery({
    queryKey: ['tax_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_settings')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as TaxSetting[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('tax_settings').insert({
        name: data.name,
        description: data.description || null,
        percentage: parseFloat(data.percentage) || 0,
        applies_to: data.applies_to.length > 0 ? data.applies_to : null,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_settings'] });
      toast.success('Tax setting created successfully');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('tax_settings')
        .update({
          name: data.name,
          description: data.description || null,
          percentage: parseFloat(data.percentage) || 0,
          applies_to: data.applies_to.length > 0 ? data.applies_to : null,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_settings'] });
      toast.success('Tax setting updated successfully');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tax_settings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_settings'] });
      toast.success('Tax setting deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleOpenDialog = (tax?: TaxSetting) => {
    if (tax) {
      setEditingTax(tax);
      setFormData({
        name: tax.name,
        description: tax.description || '',
        percentage: tax.percentage.toString(),
        applies_to: tax.applies_to || [],
        is_active: tax.is_active,
      });
    } else {
      setEditingTax(null);
      setFormData({ name: '', description: '', percentage: '', applies_to: [], is_active: true });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTax(null);
    setFormData({ name: '', description: '', percentage: '', applies_to: [], is_active: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Tax name is required');
      return;
    }
    if (!formData.percentage || parseFloat(formData.percentage) < 0) {
      toast.error('Please enter a valid percentage');
      return;
    }

    if (editingTax) {
      updateMutation.mutate({ id: editingTax.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tax setting?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCategoryToggle = (categoryKey: string) => {
    setFormData((prev) => ({
      ...prev,
      applies_to: prev.applies_to.includes(categoryKey)
        ? prev.applies_to.filter((c) => c !== categoryKey)
        : [...prev.applies_to, categoryKey],
    }));
  };

  const getCategoryLabel = (key: string) => {
    return APPLICABLE_CATEGORIES.find((c) => c.key === key)?.label || key;
  };

  return (
    <DashboardLayout title="Tax Settings" subtitle="Configure GST and taxes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tax Settings</h1>
            <p className="text-muted-foreground">
              Configure GST, Service Tax, and other applicable taxes
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tax
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              All Tax Settings
            </CardTitle>
            <CardDescription>
              {taxes.length} tax{taxes.length !== 1 ? 'es' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : taxes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tax settings found. Create your first tax configuration.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Applies To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxes.map((tax) => (
                    <TableRow key={tax.id}>
                      <TableCell className="font-medium">{tax.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {tax.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tax.percentage}%</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {tax.applies_to && tax.applies_to.length > 0 ? (
                            tax.applies_to.slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                {getCategoryLabel(cat)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">All categories</span>
                          )}
                          {tax.applies_to && tax.applies_to.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{tax.applies_to.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tax.is_active ? 'default' : 'secondary'}>
                          {tax.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(tax)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(tax.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTax ? 'Edit Tax Setting' : 'Add Tax Setting'}
              </DialogTitle>
              <DialogDescription>
                {editingTax
                  ? 'Update tax configuration'
                  : 'Create a new tax configuration for billing'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tax Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., GST, CGST, SGST, Service Tax"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the tax"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentage">Tax Percentage (%) *</Label>
                  <Input
                    id="percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g., 18.00"
                    value={formData.percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, percentage: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-3">
                  <Label>Applicable Categories</Label>
                  <p className="text-xs text-muted-foreground">
                    Select categories where this tax applies. Leave empty for all categories.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {APPLICABLE_CATEGORIES.map((category) => (
                      <div key={category.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.key}
                          checked={formData.applies_to.includes(category.key)}
                          onCheckedChange={() => handleCategoryToggle(category.key)}
                        />
                        <Label
                          htmlFor={category.key}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {category.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active Status</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingTax ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

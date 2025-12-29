import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, BedDouble, X } from 'lucide-react';
import { useHotelSettings } from '@/hooks/useHotelSettings';

interface RoomType {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  max_occupancy: number;
  amenities: string[] | null;
  is_active: boolean;
  created_at: string;
}

export default function RoomTypes() {
  const queryClient = useQueryClient();
  const { settings } = useHotelSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [newAmenity, setNewAmenity] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    max_occupancy: '2',
    amenities: [] as string[],
    is_active: true,
  });

  const { data: roomTypes = [], isLoading } = useQuery({
    queryKey: ['room_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .order('base_price');
      if (error) throw error;
      return data as RoomType[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('room_types').insert({
        name: data.name,
        description: data.description || null,
        base_price: parseFloat(data.base_price) || 0,
        max_occupancy: parseInt(data.max_occupancy) || 2,
        amenities: data.amenities.length > 0 ? data.amenities : null,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_types'] });
      toast.success('Room type created successfully');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('room_types')
        .update({
          name: data.name,
          description: data.description || null,
          base_price: parseFloat(data.base_price) || 0,
          max_occupancy: parseInt(data.max_occupancy) || 2,
          amenities: data.amenities.length > 0 ? data.amenities : null,
          is_active: data.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_types'] });
      toast.success('Room type updated successfully');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('room_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room_types'] });
      toast.success('Room type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleOpenDialog = (roomType?: RoomType) => {
    if (roomType) {
      setEditingType(roomType);
      setFormData({
        name: roomType.name,
        description: roomType.description || '',
        base_price: roomType.base_price.toString(),
        max_occupancy: roomType.max_occupancy.toString(),
        amenities: roomType.amenities || [],
        is_active: roomType.is_active,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        description: '',
        base_price: '',
        max_occupancy: '2',
        amenities: [],
        is_active: true,
      });
    }
    setNewAmenity('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingType(null);
    setNewAmenity('');
    setFormData({
      name: '',
      description: '',
      base_price: '',
      max_occupancy: '2',
      amenities: [],
      is_active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Room type name is required');
      return;
    }
    if (!formData.base_price || parseFloat(formData.base_price) < 0) {
      toast.error('Please enter a valid base price');
      return;
    }

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this room type?')) {
      deleteMutation.mutate(id);
    }
  };

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, newAmenity.trim()],
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenity),
    }));
  };

  const currencySymbol = settings?.currency_symbol || '₹';

  return (
    <DashboardLayout title="Room Types" subtitle="Manage room categories">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Room Types</h1>
            <p className="text-muted-foreground">
              Create and manage room categories like Deluxe, Suite, Standard, etc.
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Room Type
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              All Room Types
            </CardTitle>
            <CardDescription>
              {roomTypes.length} room type{roomTypes.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : roomTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No room types found. Create your first room type.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Max Occupancy</TableHead>
                    <TableHead>Amenities</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {type.description || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {currencySymbol}{type.base_price.toFixed(2)}
                      </TableCell>
                      <TableCell>{type.max_occupancy} guests</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {type.amenities && type.amenities.length > 0 ? (
                            <>
                              {type.amenities.slice(0, 2).map((amenity) => (
                                <Badge key={amenity} variant="secondary" className="text-xs">
                                  {amenity}
                                </Badge>
                              ))}
                              {type.amenities.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{type.amenities.length - 2}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? 'default' : 'secondary'}>
                          {type.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(type)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(type.id)}
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
                {editingType ? 'Edit Room Type' : 'Add Room Type'}
              </DialogTitle>
              <DialogDescription>
                {editingType
                  ? 'Update room type details and pricing'
                  : 'Create a new room category for your hotel'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Room Type Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Deluxe, Suite, Standard"
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
                    placeholder="Brief description of the room type"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="base_price">Base Price ({currencySymbol}) *</Label>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.base_price}
                      onChange={(e) =>
                        setFormData({ ...formData, base_price: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_occupancy">Max Occupancy</Label>
                    <Input
                      id="max_occupancy"
                      type="number"
                      min="1"
                      max="20"
                      value={formData.max_occupancy}
                      onChange={(e) =>
                        setFormData({ ...formData, max_occupancy: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amenities</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add amenity (e.g., WiFi, AC, TV)"
                      value={newAmenity}
                      onChange={(e) => setNewAmenity(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addAmenity();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addAmenity}>
                      Add
                    </Button>
                  </div>
                  {formData.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.amenities.map((amenity) => (
                        <Badge key={amenity} variant="secondary" className="gap-1">
                          {amenity}
                          <button
                            type="button"
                            onClick={() => removeAmenity(amenity)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
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
                  {editingType ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

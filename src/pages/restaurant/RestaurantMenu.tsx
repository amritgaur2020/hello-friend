import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRestaurantMenu, useRestaurantMutations, useRestaurantInventory } from '@/hooks/useDepartmentData';
import { useHotelSettings } from '@/hooks/useHotelSettings';
import { Plus, Edit, ChefHat, Calculator, ListChecks } from 'lucide-react';
import { MenuExcelImport } from '@/components/shared/MenuExcelImport';
import { RecipeEditor } from '@/components/shared/RecipeEditor';
import { RecipeCostAnalyzer } from '@/components/shared/RecipeCostAnalyzer';
import { BulkRecipeEditor } from '@/components/shared/BulkRecipeEditor';
import { RecipeIngredient } from '@/types/department';
import { useToast } from '@/hooks/use-toast';
import { calculateIngredientCost } from '@/constants/inventoryUnits';
import { useQueryClient } from '@tanstack/react-query';

const MENU_CATEGORIES = [
  { value: 'starters', label: 'Starters' },
  { value: 'soups', label: 'Soups' },
  { value: 'salads', label: 'Salads' },
  { value: 'main_course', label: 'Main Course' },
  { value: 'rice', label: 'Rice & Biryani' },
  { value: 'breads', label: 'Breads' },
  { value: 'desserts', label: 'Desserts' },
  { value: 'beverages', label: 'Beverages' },
];

interface MenuFormData {
  name: string;
  category: string;
  price: number;
  description: string;
  is_available: boolean;
  ingredients: RecipeIngredient[];
}

export default function RestaurantMenu() {
  const { data: menuItems = [] } = useRestaurantMenu();
  const { data: inventory = [] } = useRestaurantInventory();
  const { addMenuItem, updateMenuItem, bulkAddMenuItems, addInventory } = useRestaurantMutations();
  const { settings } = useHotelSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<MenuFormData>({
    name: '',
    category: 'main_course',
    price: 0,
    description: '',
    is_available: true,
    ingredients: [],
  });
  const [dialogTab, setDialogTab] = useState('details');
  const [pageTab, setPageTab] = useState('menu');

  const handleSave = async () => {
    try {
      // Convert ingredients to JSON-compatible format
      const ingredientsJson = formData.ingredients.map(ing => ({
        inventory_id: ing.inventory_id,
        inventory_name: ing.inventory_name,
        quantity: ing.quantity,
        unit: ing.unit,
      }));
      
      if (editingItem) {
        await updateMenuItem.mutateAsync({
          id: editingItem.id,
          name: formData.name,
          category: formData.category,
          price: formData.price,
          description: formData.description || null,
          is_available: formData.is_available,
          ingredients: ingredientsJson,
        });
      } else {
        await addMenuItem.mutateAsync({
          name: formData.name,
          category: formData.category,
          price: formData.price,
          description: formData.description || null,
          is_available: formData.is_available,
          ingredients: ingredientsJson,
        });
      }
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving menu item:', error);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'main_course',
      price: 0,
      description: '',
      is_available: true,
      ingredients: [],
    });
    setDialogTab('details');
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || '',
      is_available: item.is_available,
      ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
    });
    setShowDialog(true);
  };

  const openAdd = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleBulkImport = async (
    items: { name: string; category: string; price: number; description: string; ingredients: RecipeIngredient[] }[],
    newInventoryItems?: { name: string; unit: string; cost_price: number; category: string; current_stock: number; min_stock_level: number }[]
  ) => {
    try {
      // Step 1: Create new inventory items first (if any)
      const inventoryIdMap = new Map<string, string>(); // Map ingredient name to new ID
      
      if (newInventoryItems && newInventoryItems.length > 0) {
        for (const invItem of newInventoryItems) {
          try {
            const result = await addInventory.mutateAsync({
              name: invItem.name,
              category: invItem.category,
              unit: invItem.unit,
              cost_price: invItem.cost_price,
              current_stock: invItem.current_stock,
              min_stock_level: invItem.min_stock_level,
            });
            // Store the mapping of name to new ID
            inventoryIdMap.set(invItem.name.toLowerCase().replace(/[_\s-]+/g, ''), result.id);
          } catch (err) {
            console.error(`Failed to create inventory item: ${invItem.name}`, err);
          }
        }
        
        // Refresh inventory cache to get new items
        await queryClient.invalidateQueries({ queryKey: ['restaurant-inventory'] });
        
        toast({ title: `Created ${inventoryIdMap.size} new inventory items` });
      }
      
      // Step 2: Update menu items with new inventory IDs
      const itemsWithUpdatedIds = items.map(item => ({
        ...item,
        ingredients: item.ingredients.map(ing => {
          // If ingredient has no inventory_id, try to find it from the newly created items
          if (!ing.inventory_id) {
            const key = ing.inventory_name.toLowerCase().replace(/[_\s-]+/g, '');
            const newId = inventoryIdMap.get(key);
            if (newId) {
              return { ...ing, inventory_id: newId };
            }
          }
          return ing;
        }).map(ing => ({
          inventory_id: ing.inventory_id,
          inventory_name: ing.inventory_name,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      }));
      
      // Step 3: Bulk add menu items
      await bulkAddMenuItems.mutateAsync(itemsWithUpdatedIds);
      toast({ title: `Imported ${items.length} menu items with recipes` });
    } catch (error) {
      console.error('Bulk import error:', error);
      toast({ title: 'Failed to complete import', variant: 'destructive' });
    }
  };

  // Calculate recipe cost for an item with proper unit conversion
  const getRecipeCost = (ingredients: RecipeIngredient[] | null) => {
    if (!ingredients || ingredients.length === 0) return 0;
    return ingredients.reduce((sum, ing) => {
      const item = inventory.find(i => i.id === ing.inventory_id);
      if (!item || !item.cost_price) return sum;
      // Use proper unit conversion (g to kg, ml to l, etc.)
      return sum + calculateIngredientCost(ing.quantity, ing.unit, item.cost_price, item.unit || 'pcs');
    }, 0);
  };

  // Bulk update handler
  const handleBulkUpdateItems = async (updates: { id: string; ingredients: RecipeIngredient[] }[]) => {
    for (const update of updates) {
      await updateMenuItem.mutateAsync({
        id: update.id,
        ingredients: update.ingredients.map(ing => ({
          inventory_id: ing.inventory_id,
          inventory_name: ing.inventory_name,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
      });
    }
  };

  return (
    <DashboardLayout title="Restaurant Menu" subtitle="Manage food menu items with recipes">
      <Tabs value={pageTab} onValueChange={setPageTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="menu" className="gap-2">
            <ChefHat className="h-4 w-4" />
            Menu Items
          </TabsTrigger>
          <TabsTrigger value="analyzer" className="gap-2">
            <Calculator className="h-4 w-4" />
            Cost Analyzer
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Bulk Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <h3 className="font-semibold">Menu Items ({menuItems.length})</h3>
            <div className="flex gap-2 flex-wrap">
              <MenuExcelImport
                inventory={inventory}
                onImport={handleBulkImport}
                isLoading={bulkAddMenuItems.isPending || addInventory.isPending}
                currencySymbol={currencySymbol}
              />
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Recipe</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => {
                    const ingredients = Array.isArray(item.ingredients) ? item.ingredients as RecipeIngredient[] : [];
                    const cost = getRecipeCost(ingredients);
                    const margin = item.price > 0 && cost > 0 ? ((item.price - cost) / item.price * 100).toFixed(0) : '-';
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.category.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ingredients.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <ChefHat className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{ingredients.length} items</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No recipe</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{currencySymbol}{item.price}</TableCell>
                        <TableCell className="text-right">
                          {cost > 0 ? (
                            <span className="text-muted-foreground">
                              {currencySymbol}{cost.toFixed(2)}
                              <span className="text-xs ml-1">({margin}%)</span>
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={(checked) => updateMenuItem.mutate({ id: item.id, is_available: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {menuItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No menu items. Add items manually or import from Excel.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyzer">
          <RecipeCostAnalyzer
            menuItems={menuItems}
            inventory={inventory}
            currencySymbol={currencySymbol}
          />
        </TabsContent>

        <TabsContent value="bulk">
          <BulkRecipeEditor
            menuItems={menuItems}
            inventory={inventory}
            currencySymbol={currencySymbol}
            onUpdateItems={handleBulkUpdateItems}
            isUpdating={updateMenuItem.isPending}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
          </DialogHeader>
          
          <Tabs value={dialogTab} onValueChange={setDialogTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Item Details</TabsTrigger>
              <TabsTrigger value="recipe">Recipe / Ingredients</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Paneer Tikka"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MENU_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Price *</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="recipe" className="mt-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add ingredients from inventory. When this item is ordered, stock will be automatically deducted.
                </p>
                <RecipeEditor
                  ingredients={formData.ingredients}
                  inventory={inventory}
                  onChange={(ingredients) => setFormData({ ...formData, ingredients })}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || formData.price <= 0 || addMenuItem.isPending || updateMenuItem.isPending}
            >
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

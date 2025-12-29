import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  Pencil, 
  Trash2, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';
import { DepartmentMenuItem, DepartmentInventory, RecipeIngredient } from '@/types/department';
import { calculateIngredientCost, normalizeUnit } from '@/constants/inventoryUnits';
import { useToast } from '@/hooks/use-toast';

interface BulkRecipeEditorProps {
  menuItems: DepartmentMenuItem[];
  inventory: DepartmentInventory[];
  currencySymbol?: string;
  onUpdateItems: (updates: { id: string; ingredients: RecipeIngredient[] }[]) => Promise<void>;
  isUpdating?: boolean;
}

type BulkAction = 'scale' | 'replace' | 'remove' | 'add';

interface SelectedItem {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  modified: boolean;
}

export function BulkRecipeEditor({
  menuItems,
  inventory,
  currencySymbol = '₹',
  onUpdateItems,
  isUpdating = false,
}: BulkRecipeEditorProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [currentAction, setCurrentAction] = useState<BulkAction>('scale');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Action-specific state
  const [scaleMultiplier, setScaleMultiplier] = useState<string>('1');
  const [targetInventoryId, setTargetInventoryId] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [newUnit, setNewUnit] = useState<string>('g');
  const [addInventoryId, setAddInventoryId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<string>('');
  const [addUnit, setAddUnit] = useState<string>('g');
  
  // Track modified recipes
  const [modifiedRecipes, setModifiedRecipes] = useState<Map<string, RecipeIngredient[]>>(new Map());

  const inventoryMap = useMemo(() => {
    const map = new Map<string, DepartmentInventory>();
    inventory.forEach(item => map.set(item.id, item));
    return map;
  }, [inventory]);

  // Items with recipes only
  const itemsWithRecipes = useMemo(() => {
    return menuItems.filter(item => item.ingredients && Array.isArray(item.ingredients) && item.ingredients.length > 0);
  }, [menuItems]);

  // Get current ingredients (modified or original)
  const getIngredients = (item: DepartmentMenuItem): RecipeIngredient[] => {
    if (modifiedRecipes.has(item.id)) {
      return modifiedRecipes.get(item.id)!;
    }
    return Array.isArray(item.ingredients) ? item.ingredients as RecipeIngredient[] : [];
  };

  // Calculate cost for ingredients
  const calculateCost = (ingredients: RecipeIngredient[]): number => {
    return ingredients.reduce((sum, ing) => {
      const item = inventoryMap.get(ing.inventory_id);
      if (!item) return sum;
      return sum + calculateIngredientCost(ing.quantity, ing.unit, item.cost_price || 0, item.unit || 'pcs');
    }, 0);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === itemsWithRecipes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(itemsWithRecipes.map(i => i.id)));
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const applyBulkAction = () => {
    const newModified = new Map(modifiedRecipes);
    
    selectedIds.forEach(id => {
      const item = menuItems.find(m => m.id === id);
      if (!item) return;
      
      let ingredients = getIngredients(item);
      
      switch (currentAction) {
        case 'scale': {
          const multiplier = parseFloat(scaleMultiplier) || 1;
          ingredients = ingredients.map(ing => ({
            ...ing,
            quantity: Math.round(ing.quantity * multiplier * 100) / 100,
          }));
          break;
        }
        case 'replace': {
          if (!targetInventoryId || !newQuantity) return;
          const qty = parseFloat(newQuantity);
          ingredients = ingredients.map(ing => {
            if (ing.inventory_id === targetInventoryId) {
              return { ...ing, quantity: qty, unit: newUnit };
            }
            return ing;
          });
          break;
        }
        case 'remove': {
          if (!targetInventoryId) return;
          ingredients = ingredients.filter(ing => ing.inventory_id !== targetInventoryId);
          break;
        }
        case 'add': {
          if (!addInventoryId || !addQuantity) return;
          const invItem = inventoryMap.get(addInventoryId);
          if (!invItem) return;
          // Check if already exists
          const existingIdx = ingredients.findIndex(ing => ing.inventory_id === addInventoryId);
          if (existingIdx >= 0) {
            ingredients[existingIdx] = {
              ...ingredients[existingIdx],
              quantity: parseFloat(addQuantity),
              unit: addUnit,
            };
          } else {
            ingredients = [...ingredients, {
              inventory_id: addInventoryId,
              inventory_name: invItem.name,
              quantity: parseFloat(addQuantity),
              unit: addUnit,
            }];
          }
          break;
        }
      }
      
      newModified.set(id, ingredients);
    });
    
    setModifiedRecipes(newModified);
    setShowActionDialog(false);
    toast({
      title: 'Changes applied',
      description: `Updated ${selectedIds.size} items. Click "Save All Changes" to persist.`,
    });
  };

  const saveAllChanges = async () => {
    if (modifiedRecipes.size === 0) {
      toast({ title: 'No changes to save', variant: 'destructive' });
      return;
    }

    const updates = Array.from(modifiedRecipes.entries()).map(([id, ingredients]) => ({
      id,
      ingredients,
    }));

    try {
      await onUpdateItems(updates);
      setModifiedRecipes(new Map());
      setSelectedIds(new Set());
      toast({ title: 'All changes saved successfully' });
    } catch (error) {
      toast({ title: 'Error saving changes', variant: 'destructive' });
    }
  };

  const discardChanges = () => {
    setModifiedRecipes(new Map());
    toast({ title: 'All changes discarded' });
  };

  const openActionDialog = (action: BulkAction) => {
    if (selectedIds.size === 0) {
      toast({ title: 'Select items first', variant: 'destructive' });
      return;
    }
    setCurrentAction(action);
    setShowActionDialog(true);
  };

  // Get common ingredients across selected items (filter out empty IDs)
  const commonIngredients = useMemo(() => {
    if (selectedIds.size === 0) return [];
    
    const ingredientCounts = new Map<string, { name: string; count: number }>();
    
    selectedIds.forEach(id => {
      const item = menuItems.find(m => m.id === id);
      if (!item) return;
      const ingredients = getIngredients(item);
      ingredients.forEach(ing => {
        // Skip ingredients with empty or undefined IDs
        if (!ing.inventory_id) return;
        
        const existing = ingredientCounts.get(ing.inventory_id);
        if (existing) {
          existing.count++;
        } else {
          ingredientCounts.set(ing.inventory_id, { name: ing.inventory_name, count: 1 });
        }
      });
    });
    
    return Array.from(ingredientCounts.entries())
      .filter(([id, _]) => id && id.trim() !== '') // Filter out empty IDs
      .filter(([_, data]) => data.count > 1)
      .sort((a, b) => b[1].count - a[1].count);
  }, [selectedIds, menuItems, modifiedRecipes]);

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="gap-2"
              >
                {selectedIds.size === itemsWithRecipes.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select All'}
              </Button>
              
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActionDialog('scale')}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Scale Quantities
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActionDialog('replace')}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Update Ingredient
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActionDialog('add')}
                  >
                    + Add Ingredient
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActionDialog('remove')}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Ingredient
                  </Button>
                </>
              )}
            </div>
            
            {modifiedRecipes.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600">
                  {modifiedRecipes.size} items modified
                </Badge>
                <Button variant="outline" size="sm" onClick={discardChanges}>
                  Discard
                </Button>
                <Button size="sm" onClick={saveAllChanges} disabled={isUpdating}>
                  <Save className="h-4 w-4 mr-2" />
                  Save All Changes
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Menu Items with Recipes ({itemsWithRecipes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {itemsWithRecipes.map(item => {
                const ingredients = getIngredients(item);
                const cost = calculateCost(ingredients);
                const isModified = modifiedRecipes.has(item.id);
                const isSelected = selectedIds.has(item.id);
                const isExpanded = expandedItems.has(item.id);
                const margin = item.price > 0 ? ((item.price - cost) / item.price * 100) : 0;
                
                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg ${isModified ? 'border-amber-500 bg-amber-500/5' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex items-center p-3 gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleExpanded(item.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {isModified && (
                            <Badge variant="outline" className="text-amber-600 text-xs">
                              Modified
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {ingredients.length} ingredients
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">{currencySymbol}{cost.toFixed(2)}</div>
                        <div className={`text-xs ${margin < 30 ? 'text-red-600' : 'text-green-600'}`}>
                          {margin.toFixed(0)}% margin
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                          {ingredients.map((ing, idx) => {
                            const invItem = inventoryMap.get(ing.inventory_id);
                            const ingCost = invItem 
                              ? calculateIngredientCost(ing.quantity, ing.unit, invItem.cost_price || 0, invItem.unit || 'pcs')
                              : 0;
                            
                            return (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono">
                                    {ing.quantity} {ing.unit}
                                  </Badge>
                                  <span>{ing.inventory_name}</span>
                                </div>
                                <span className="text-muted-foreground">
                                  {currencySymbol}{ingCost.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {itemsWithRecipes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No menu items with recipes found. Add recipes to menu items first.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Bulk Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentAction === 'scale' && 'Scale All Quantities'}
              {currentAction === 'replace' && 'Update Ingredient'}
              {currentAction === 'remove' && 'Remove Ingredient'}
              {currentAction === 'add' && 'Add Ingredient'}
            </DialogTitle>
            <DialogDescription>
              This will apply to {selectedIds.size} selected item{selectedIds.size > 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {currentAction === 'scale' && (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This will multiply all ingredient quantities by the scale factor.
                    Use 0.5 to halve quantities, 2 to double them.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>Scale Factor</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={scaleMultiplier}
                    onChange={(e) => setScaleMultiplier(e.target.value)}
                    placeholder="1.0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Examples: 0.1 = reduce to 10%, 0.5 = halve, 2 = double
                  </p>
                </div>
              </div>
            )}
            
            {currentAction === 'replace' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Ingredient to Update</Label>
                  <Select value={targetInventoryId} onValueChange={setTargetInventoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose ingredient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {commonIngredients.map(([id, data]) => (
                        <SelectItem key={id} value={id}>
                          {data.name} (in {data.count} items)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Quantity</Label>
                    <Input
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={newUnit} onValueChange={setNewUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['g', 'kg', 'ml', 'l', 'pcs'].map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
            {currentAction === 'remove' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This will remove the selected ingredient from all selected menu items.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>Select Ingredient to Remove</Label>
                  <Select value={targetInventoryId} onValueChange={setTargetInventoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose ingredient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {commonIngredients.map(([id, data]) => (
                        <SelectItem key={id} value={id}>
                          {data.name} (in {data.count} items)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {currentAction === 'add' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Ingredient to Add</Label>
                  <Select value={addInventoryId} onValueChange={setAddInventoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose from inventory..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory
                        .filter(item => item.id && item.id.trim() !== '')
                        .map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({currencySymbol}{item.cost_price}/{item.unit})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(e.target.value)}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={addUnit} onValueChange={setAddUnit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['g', 'kg', 'ml', 'l', 'pcs'].map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={applyBulkAction}>
              Apply to {selectedIds.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
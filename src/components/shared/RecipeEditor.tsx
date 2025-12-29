import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';
import { RecipeIngredient, DepartmentInventory, DepartmentMenuItem } from '@/types/department';
import { MASTER_UNITS, calculateIngredientCost, checkIngredientStock, normalizeUnit } from '@/constants/inventoryUnits';

interface RecipeEditorProps {
  ingredients: RecipeIngredient[];
  inventory: DepartmentInventory[];
  onChange: (ingredients: RecipeIngredient[]) => void;
  menuItems?: DepartmentMenuItem[];
  currentCategory?: string;
}

interface IngredientSuggestion {
  quantity: number;
  unit: string;
  count: number;
  avgQuantity: number;
  fromItems: string[];
}

// Recipe-specific units including cooking measurements
const RECIPE_UNITS = [
  ...MASTER_UNITS.filter(u => ['g', 'kg', 'ml', 'l', 'pcs'].includes(u.value)).map(u => u.value),
  'tbsp', 'tsp', 'cups'
];

// Thresholds for validation warnings (per single serving/dish)
const QUANTITY_WARNINGS: Record<string, { max: number; label: string }> = {
  kg: { max: 1, label: '1 kg' },
  g: { max: 1000, label: '1 kg' },
  l: { max: 1, label: '1 L' },
  ml: { max: 1000, label: '1 L' },
  pcs: { max: 20, label: '20 pieces' },
  dozen: { max: 2, label: '2 dozen' },
};

// Check if quantity seems unrealistic for a single dish
function getQuantityWarning(quantity: number, unit: string): string | null {
  const normalizedUnit = normalizeUnit(unit);
  const threshold = QUANTITY_WARNINGS[normalizedUnit];
  
  if (threshold && quantity > threshold.max) {
    return `Quantity seems high for a single dish (>${threshold.label}). Please verify.`;
  }
  return null;
}

export function RecipeEditor({ ingredients, inventory, onChange, menuItems = [], currentCategory }: RecipeEditorProps) {
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unit, setUnit] = useState<string>('g');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Analyze existing recipes to find common quantities for each ingredient
  const ingredientSuggestions = useMemo(() => {
    const suggestions: Record<string, IngredientSuggestion> = {};
    
    if (!menuItems.length) return suggestions;

    // Filter to similar items (same category if available, or all items)
    const relevantItems = currentCategory
      ? menuItems.filter(item => item.category === currentCategory && item.ingredients?.length)
      : menuItems.filter(item => item.ingredients?.length);

    // Analyze each recipe
    relevantItems.forEach(item => {
      if (!item.ingredients) return;
      
      item.ingredients.forEach(ing => {
        const key = ing.inventory_id;
        if (!key) return;

        if (!suggestions[key]) {
          suggestions[key] = {
            quantity: ing.quantity,
            unit: ing.unit,
            count: 1,
            avgQuantity: ing.quantity,
            fromItems: [item.name],
          };
        } else {
          const existing = suggestions[key];
          // Calculate running average
          const totalQty = existing.avgQuantity * existing.count + ing.quantity;
          existing.count++;
          existing.avgQuantity = totalQty / existing.count;
          // Keep most common quantity (mode approximation)
          if (existing.fromItems.length < 5) {
            existing.fromItems.push(item.name);
          }
        }
      });
    });

    return suggestions;
  }, [menuItems, currentCategory]);

  // Get suggestion for currently selected ingredient
  const currentSuggestion = selectedInventoryId ? ingredientSuggestions[selectedInventoryId] : null;

  const handleAdd = () => {
    if (!selectedInventoryId || !quantity) return;
    
    const inventoryItem = inventory.find(i => i.id === selectedInventoryId);
    if (!inventoryItem) return;
    
    const newIngredient: RecipeIngredient = {
      inventory_id: selectedInventoryId,
      inventory_name: inventoryItem.name,
      quantity: parseFloat(quantity),
      unit,
    };
    
    // Check if ingredient already exists
    const existingIndex = ingredients.findIndex(i => i.inventory_id === selectedInventoryId);
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...ingredients];
      updated[existingIndex] = newIngredient;
      onChange(updated);
    } else {
      // Add new
      onChange([...ingredients, newIngredient]);
    }
    
    // Reset form
    setSelectedInventoryId('');
    setQuantity('');
    setShowSuggestions(false);
  };

  const handleRemove = (inventoryId: string) => {
    onChange(ingredients.filter(i => i.inventory_id !== inventoryId));
  };

  const applySuggestion = (suggestion: IngredientSuggestion) => {
    setQuantity(Math.round(suggestion.avgQuantity).toString());
    setUnit(suggestion.unit);
    setShowSuggestions(false);
  };

  // Calculate estimated cost with proper unit conversion
  const totalCost = ingredients.reduce((sum, ing) => {
    const item = inventory.find(i => i.id === ing.inventory_id);
    if (!item || !item.cost_price) return sum;
    return sum + calculateIngredientCost(ing.quantity, ing.unit, item.cost_price, item.unit || 'pcs');
  }, 0);

  // Check for quantity warnings
  const ingredientWarnings = ingredients.map(ing => ({
    ...ing,
    warning: getQuantityWarning(ing.quantity, ing.unit),
  }));

  const hasWarnings = ingredientWarnings.some(i => i.warning);

  const availableInventory = inventory.filter(
    i => !ingredients.some(ing => ing.inventory_id === i.id)
  );

  // Live validation for current input
  const currentInputWarning = quantity ? getQuantityWarning(parseFloat(quantity), unit) : null;

  // Get suggested ingredients not yet added (ingredients commonly used in similar items)
  const suggestedIngredients = useMemo(() => {
    const addedIds = new Set(ingredients.map(i => i.inventory_id));
    return Object.entries(ingredientSuggestions)
      .filter(([id, suggestion]) => !addedIds.has(id) && suggestion.count >= 2)
      .map(([id, suggestion]) => {
        const item = inventory.find(i => i.id === id);
        return { id, name: item?.name || '', suggestion, item };
      })
      .filter(s => s.item)
      .sort((a, b) => b.suggestion.count - a.suggestion.count)
      .slice(0, 5);
  }, [ingredientSuggestions, ingredients, inventory]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select 
          value={selectedInventoryId} 
          onValueChange={(val) => {
            setSelectedInventoryId(val);
            // Auto-show suggestions when ingredient is selected
            if (ingredientSuggestions[val]) {
              setShowSuggestions(true);
            }
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select ingredient" />
          </SelectTrigger>
          <SelectContent>
            {availableInventory.map(item => (
              <SelectItem key={item.id} value={item.id}>
                <div className="flex items-center gap-2">
                  <span>{item.name} ({item.current_stock} {item.unit} @ ₹{item.cost_price}/{item.unit})</span>
                  {ingredientSuggestions[item.id] && (
                    <Sparkles className="h-3 w-3 text-amber-500" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Popover open={showSuggestions && !!currentSuggestion} onOpenChange={setShowSuggestions}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                type="number"
                placeholder="Qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-24 ${currentInputWarning ? 'border-amber-500' : ''} ${currentSuggestion ? 'pr-7' : ''}`}
              />
              {currentSuggestion && !quantity && (
                <Lightbulb 
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 cursor-pointer" 
                  onClick={() => setShowSuggestions(true)}
                />
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Suggested Quantity</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {currentSuggestion?.count} similar {currentCategory || 'menu'} items
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => currentSuggestion && applySuggestion(currentSuggestion)}
              >
                <Badge variant="secondary" className="mr-2">
                  {Math.round(currentSuggestion?.avgQuantity || 0)} {currentSuggestion?.unit}
                </Badge>
                <span className="text-xs text-muted-foreground truncate">
                  Used in: {currentSuggestion?.fromItems.slice(0, 2).join(', ')}
                  {(currentSuggestion?.fromItems.length || 0) > 2 ? '...' : ''}
                </span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECIPE_UNITS.map(u => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button type="button" size="icon" onClick={handleAdd} disabled={!selectedInventoryId || !quantity}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Suggested ingredients from similar items */}
      {suggestedIngredients.length > 0 && ingredients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Quick add:
          </span>
          {suggestedIngredients.map(({ id, name, suggestion }) => (
            <Badge
              key={id}
              variant="outline"
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                const inventoryItem = inventory.find(i => i.id === id);
                if (!inventoryItem) return;
                
                const newIngredient: RecipeIngredient = {
                  inventory_id: id,
                  inventory_name: inventoryItem.name,
                  quantity: Math.round(suggestion.avgQuantity),
                  unit: suggestion.unit,
                };
                onChange([...ingredients, newIngredient]);
              }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {name} ({Math.round(suggestion.avgQuantity)} {suggestion.unit})
            </Badge>
          ))}
        </div>
      )}

      {/* Live input warning */}
      {currentInputWarning && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-600 text-sm">
            {currentInputWarning}
          </AlertDescription>
        </Alert>
      )}

      {ingredients.length > 0 && (
        <ScrollArea className="h-[200px] border rounded-md p-2">
          <div className="space-y-2">
            {ingredientWarnings.map((ing) => {
              const item = inventory.find(i => i.id === ing.inventory_id);
              const stockCheck = item 
                ? checkIngredientStock(ing.quantity, ing.unit, item.current_stock, item.unit || 'pcs')
                : { hasStock: false, unitMismatch: false };
              const hasStock = stockCheck.hasStock;
              const ingredientCost = item 
                ? calculateIngredientCost(ing.quantity, ing.unit, item.cost_price || 0, item.unit || 'pcs')
                : 0;
              
              return (
                <div 
                  key={ing.inventory_id || ing.inventory_name} 
                  className={`flex flex-col p-2 rounded-md ${ing.warning ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={hasStock ? 'secondary' : 'destructive'}>
                        {ing.quantity} {ing.unit}
                      </Badge>
                      <span className="font-medium">{ing.inventory_name}</span>
                      {item && (
                        <span className="text-xs text-muted-foreground">
                          (₹{ingredientCost.toFixed(2)})
                        </span>
                      )}
                      {ing.warning && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemove(ing.inventory_id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {ing.warning && (
                    <p className="text-xs text-amber-600 mt-1">{ing.warning}</p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Summary with warnings */}
      {ingredients.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Recipe: {ingredients.length} ingredients
            </span>
            {totalCost > 0 && (
              <span className={`font-medium ${totalCost > 500 ? 'text-amber-600' : 'text-green-600'}`}>
                Est. cost: ₹{totalCost.toFixed(2)}
              </span>
            )}
          </div>
          
          {hasWarnings && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-600 text-sm">
                Some ingredients have unusually high quantities. This may cause inflated COGS in reports.
              </AlertDescription>
            </Alert>
          )}
          
          {totalCost > 500 && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-600 text-sm">
                Recipe cost exceeds ₹500. Please verify ingredient quantities and cost prices.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {ingredients.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No ingredients added. Add ingredients from inventory for auto stock deduction.
        </p>
      )}
    </div>
  );
}
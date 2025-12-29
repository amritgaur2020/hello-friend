import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronUp, Search, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { DepartmentMenuItem, DepartmentInventory, RecipeIngredient } from '@/types/department';
import { calculateIngredientCost, normalizeUnit } from '@/constants/inventoryUnits';

interface RecipeCostAnalyzerProps {
  menuItems: DepartmentMenuItem[];
  inventory: DepartmentInventory[];
  currencySymbol?: string;
  costThreshold?: number; // Flag items with cost above this
  marginThreshold?: number; // Flag items with margin below this percentage
}

interface AnalyzedItem {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  recipeCost: number;
  margin: number;
  marginPercentage: number;
  hasRecipe: boolean;
  ingredientCount: number;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    cost: number;
    warning: string | null;
  }[];
  warnings: string[];
}

// Thresholds for warnings
const QUANTITY_THRESHOLDS: Record<string, number> = {
  kg: 1,
  g: 1000,
  l: 1,
  ml: 1000,
  pcs: 20,
};

function analyzeRecipe(
  menuItem: DepartmentMenuItem,
  inventoryMap: Map<string, DepartmentInventory>
): AnalyzedItem {
  const warnings: string[] = [];
  const ingredients: AnalyzedItem['ingredients'] = [];
  let recipeCost = 0;

  if (menuItem.ingredients && Array.isArray(menuItem.ingredients) && menuItem.ingredients.length > 0) {
    const recipeIngredients = menuItem.ingredients as RecipeIngredient[];
    
    recipeIngredients.forEach(ing => {
      const invItem = inventoryMap.get(ing.inventory_id);
      let cost = 0;
      let warning: string | null = null;

      if (invItem) {
        cost = calculateIngredientCost(
          ing.quantity || 0,
          ing.unit || 'pcs',
          invItem.cost_price || 0,
          invItem.unit || 'pcs'
        );
        recipeCost += cost;

        // Check for unrealistic quantities
        const normalizedUnit = normalizeUnit(ing.unit || 'pcs');
        const threshold = QUANTITY_THRESHOLDS[normalizedUnit];
        if (threshold && ing.quantity > threshold) {
          warning = `High quantity: ${ing.quantity} ${ing.unit}`;
          warnings.push(`${ing.inventory_name}: ${warning}`);
        }
      } else {
        warning = 'Inventory item not found';
        warnings.push(`${ing.inventory_name}: Item missing from inventory`);
      }

      ingredients.push({
        name: ing.inventory_name,
        quantity: ing.quantity,
        unit: ing.unit,
        cost,
        warning,
      });
    });
  }

  const margin = menuItem.price - recipeCost;
  const marginPercentage = menuItem.price > 0 ? (margin / menuItem.price) * 100 : 0;

  // Add margin warnings
  if (marginPercentage < 30 && menuItem.ingredients?.length) {
    warnings.push(`Low margin: ${marginPercentage.toFixed(0)}% (recommended: >30%)`);
  }
  if (recipeCost > menuItem.price && menuItem.ingredients?.length) {
    warnings.push('Recipe cost exceeds selling price!');
  }

  return {
    id: menuItem.id,
    name: menuItem.name,
    category: menuItem.category,
    sellingPrice: menuItem.price,
    recipeCost,
    margin,
    marginPercentage,
    hasRecipe: !!(menuItem.ingredients && menuItem.ingredients.length > 0),
    ingredientCount: menuItem.ingredients?.length || 0,
    ingredients,
    warnings,
  };
}

export function RecipeCostAnalyzer({
  menuItems,
  inventory,
  currencySymbol = '₹',
  costThreshold = 300,
  marginThreshold = 30,
}: RecipeCostAnalyzerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showOnlyWarnings, setShowOnlyWarnings] = useState(false);

  const inventoryMap = useMemo(() => {
    const map = new Map<string, DepartmentInventory>();
    inventory.forEach(item => map.set(item.id, item));
    return map;
  }, [inventory]);

  const analyzedItems = useMemo(() => {
    return menuItems
      .map(item => analyzeRecipe(item, inventoryMap))
      .sort((a, b) => b.recipeCost - a.recipeCost);
  }, [menuItems, inventoryMap]);

  const filteredItems = useMemo(() => {
    return analyzedItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesWarningFilter = !showOnlyWarnings || item.warnings.length > 0;
      return matchesSearch && matchesWarningFilter;
    });
  }, [analyzedItems, searchQuery, showOnlyWarnings]);

  const stats = useMemo(() => {
    const withRecipes = analyzedItems.filter(i => i.hasRecipe);
    const withWarnings = analyzedItems.filter(i => i.warnings.length > 0);
    const avgCost = withRecipes.length > 0 
      ? withRecipes.reduce((sum, i) => sum + i.recipeCost, 0) / withRecipes.length 
      : 0;
    const avgMargin = withRecipes.length > 0
      ? withRecipes.reduce((sum, i) => sum + i.marginPercentage, 0) / withRecipes.length
      : 0;
    
    return {
      total: menuItems.length,
      withRecipes: withRecipes.length,
      withoutRecipes: menuItems.length - withRecipes.length,
      withWarnings: withWarnings.length,
      avgCost,
      avgMargin,
    };
  }, [analyzedItems, menuItems.length]);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.withRecipes}</div>
            <p className="text-xs text-muted-foreground">Items with recipes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.withoutRecipes}</div>
            <p className="text-xs text-muted-foreground">Missing recipes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{currencySymbol}{stats.avgCost.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Avg. recipe cost</p>
          </CardContent>
        </Card>
        <Card className={stats.withWarnings > 0 ? 'border-amber-500/50' : ''}>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold ${stats.withWarnings > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {stats.withWarnings}
            </div>
            <p className="text-xs text-muted-foreground">Items with warnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showOnlyWarnings ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowOnlyWarnings(!showOnlyWarnings)}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Show Issues Only ({stats.withWarnings})
        </Button>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Menu Item Cost Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Recipe Cost</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <Collapsible key={item.id} asChild>
                    <>
                      <TableRow className={item.warnings.length > 0 ? 'bg-amber-500/5' : ''}>
                        <TableCell>
                          {item.hasRecipe && (
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleExpanded(item.id)}
                              >
                                {expandedItems.has(item.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.name}</span>
                            {item.warnings.length > 0 && (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {currencySymbol}{item.sellingPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.hasRecipe ? (
                            <span className={item.recipeCost > costThreshold ? 'text-amber-600 font-medium' : ''}>
                              {currencySymbol}{item.recipeCost.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">No recipe</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.hasRecipe ? (
                            <div className="flex items-center justify-end gap-1">
                              {item.marginPercentage >= marginThreshold ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className={item.marginPercentage < marginThreshold ? 'text-red-600' : 'text-green-600'}>
                                {item.marginPercentage.toFixed(0)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {!item.hasRecipe ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              No Recipe
                            </Badge>
                          ) : item.warnings.length > 0 ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                              {item.warnings.length} issue{item.warnings.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-600 border-green-500/50">
                              OK
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {item.hasRecipe && expandedItems.has(item.id) && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm">Ingredient Breakdown</h4>
                              <div className="grid gap-2">
                                {item.ingredients.map((ing, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`flex items-center justify-between p-2 rounded text-sm ${
                                      ing.warning ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-background'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary">
                                        {ing.quantity} {ing.unit}
                                      </Badge>
                                      <span>{ing.name}</span>
                                      {ing.warning && (
                                        <span className="text-xs text-amber-600">({ing.warning})</span>
                                      )}
                                    </div>
                                    <span className="font-medium">
                                      {currencySymbol}{ing.cost.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              
                              {item.warnings.length > 0 && (
                                <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                                  <h5 className="font-medium text-amber-600 text-sm mb-2">Warnings:</h5>
                                  <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                                    {item.warnings.map((warning, idx) => (
                                      <li key={idx}>{warning}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
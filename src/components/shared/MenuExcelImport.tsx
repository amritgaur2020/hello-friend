import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, AlertTriangle, CheckCircle, Package, ChefHat } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RecipeIngredient, DepartmentInventory } from '@/types/department';
import { normalizeUnit } from '@/constants/inventoryUnits';

interface ParsedMenuItem {
  name: string;
  category: string;
  price: number;
  description: string;
  ingredients: RecipeIngredient[];
  ingredientsRaw: string;
  warnings: string[];
  isValid: boolean;
}

interface NewInventoryItem {
  name: string;
  unit: string;
  cost_price: number;
  category: string;
  current_stock: number;
  min_stock_level: number;
  fromExcel: boolean; // Whether cost/unit was provided in Excel
}

interface MenuExcelImportProps {
  inventory: DepartmentInventory[];
  onImport: (
    menuItems: { name: string; category: string; price: number; description: string; ingredients: RecipeIngredient[] }[],
    newInventoryItems?: NewInventoryItem[]
  ) => Promise<void>;
  isLoading: boolean;
  currencySymbol?: string;
}

// Parse ingredient string like "paneer:200g,onion:20g,oil:20ml"
// Also extracts cost_price if provided: "paneer:200g:50" means cost_price = 50 per kg
function parseIngredients(
  ingredientsStr: string, 
  inventory: DepartmentInventory[],
  inventoryFromExcel: Map<string, { unit: string; cost_price: number; category: string }>
): { 
  ingredients: RecipeIngredient[]; 
  warnings: string[]; 
  missingItems: { name: string; unit: string; cost_price: number }[] 
} {
  if (!ingredientsStr || ingredientsStr.trim() === '') {
    return { ingredients: [], warnings: [], missingItems: [] };
  }

  const ingredients: RecipeIngredient[] = [];
  const warnings: string[] = [];
  const missingItems: { name: string; unit: string; cost_price: number }[] = [];
  
  const parts = ingredientsStr.split(',').map(p => p.trim()).filter(Boolean);
  
  for (const part of parts) {
    // Match pattern: name:quantityunit OR name:quantityunit:cost_price
    // Example: "paneer:200g" or "paneer:200g:400" (400 = cost per kg)
    const match = part.match(/^(.+):(\d+(?:\.\d+)?)(g|gm|gms|gram|grams|kg|kgs|kilogram|ml|mls|l|ltr|ltrs|liter|pcs|piece|pieces|nos|unit|units)?(?::(\d+(?:\.\d+)?))?$/i);
    
    if (!match) {
      warnings.push(`Invalid format: "${part}" - expected "name:quantityunit" or "name:quantityunit:cost"`);
      continue;
    }
    
    const [, ingredientName, quantityStr, rawUnit = 'pcs', costStr] = match;
    const quantity = parseFloat(quantityStr);
    const normalizedName = ingredientName.toLowerCase().trim();
    const unit = normalizeUnit(rawUnit);
    const costPrice = costStr ? parseFloat(costStr) : 0;
    
    // Find matching inventory item
    const inventoryItem = inventory.find(i => 
      i.name.toLowerCase().replace(/[_\s-]+/g, '') === normalizedName.replace(/[_\s-]+/g, '')
    );
    
    if (!inventoryItem) {
      // Check if we have Excel data for this item
      const excelData = inventoryFromExcel.get(normalizedName.replace(/[_\s-]+/g, ''));
      
      // Track as missing - will be auto-created
      const baseUnit = unit === 'g' || unit === 'gm' ? 'kg' : unit === 'ml' ? 'l' : unit;
      missingItems.push({
        name: ingredientName.trim(),
        unit: excelData?.unit || baseUnit,
        cost_price: excelData?.cost_price || costPrice || 0,
      });
      
      // Still add to recipe but without inventory_id
      ingredients.push({
        inventory_id: '', // Will be filled after inventory creation
        inventory_name: ingredientName.trim(),
        quantity,
        unit,
      });
    } else {
      ingredients.push({
        inventory_id: inventoryItem.id,
        inventory_name: inventoryItem.name,
        quantity,
        unit,
      });
    }
  }
  
  return { ingredients, warnings, missingItems };
}

export function MenuExcelImport({ inventory, onImport, isLoading, currencySymbol = '₹' }: MenuExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedMenuItem[]>([]);
  const [newInventoryItems, setNewInventoryItems] = useState<NewInventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('menu');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        if (jsonData.length === 0) {
          setError('No data found in the file');
          return;
        }
        
        // First pass: collect all inventory data from Excel (if provided in separate columns)
        const inventoryFromExcel = new Map<string, { unit: string; cost_price: number; category: string }>();
        
        // Check if there's an "inventory" sheet for detailed inventory data
        if (workbook.SheetNames.includes('Inventory')) {
          const invSheet = workbook.Sheets['Inventory'];
          const invData = XLSX.utils.sheet_to_json(invSheet, { defval: '' }) as any[];
          invData.forEach((row: any) => {
            const name = (row.name || row.Name || '').toString().trim().toLowerCase().replace(/[_\s-]+/g, '');
            if (name) {
              inventoryFromExcel.set(name, {
                unit: normalizeUnit(row.unit || row.Unit || 'kg'),
                cost_price: parseFloat(row.cost_price || row['Cost Price'] || row.cost || 0) || 0,
                category: (row.category || row.Category || 'ingredients').toString().trim(),
              });
            }
          });
        }
        
        // Track all missing items across all menu items
        const allMissingItems = new Map<string, NewInventoryItem>();
        
        const items: ParsedMenuItem[] = jsonData.map((row: any) => {
          const name = (row.name || row.Name || row.ITEM_NAME || row.item_name || '').toString().trim();
          const category = (row.category || row.Category || row.CATEGORY || 'main_course').toString().trim().toLowerCase().replace(/\s+/g, '_');
          const price = parseFloat(row.price || row.Price || row.PRICE || 0);
          const description = (row.description || row.Description || row.DESCRIPTION || '').toString().trim();
          const ingredientsRaw = (row.ingredients || row.Ingredients || row.INGREDIENTS || row.recipe || row.Recipe || '').toString().trim();
          
          const { ingredients, warnings, missingItems } = parseIngredients(ingredientsRaw, inventory, inventoryFromExcel);
          
          // Add missing items to the map (deduplicated by name)
          missingItems.forEach(item => {
            const key = item.name.toLowerCase().replace(/[_\s-]+/g, '');
            if (!allMissingItems.has(key)) {
              const excelData = inventoryFromExcel.get(key);
              allMissingItems.set(key, {
                name: item.name,
                unit: excelData?.unit || item.unit,
                cost_price: excelData?.cost_price || item.cost_price,
                category: excelData?.category || 'ingredients',
                current_stock: 0,
                min_stock_level: 5,
                fromExcel: !!excelData,
              });
            }
          });
          
          const itemWarnings = [...warnings];
          if (!name) itemWarnings.push('Name is required');
          if (price <= 0) itemWarnings.push('Price must be greater than 0');
          
          // Add info about missing inventory items
          if (missingItems.length > 0) {
            itemWarnings.push(`${missingItems.length} ingredient(s) will be auto-created in inventory`);
          }
          
          return {
            name,
            category,
            price,
            description,
            ingredients,
            ingredientsRaw,
            warnings: itemWarnings,
            isValid: !!name && price > 0,
          };
        });
        
        setParsedItems(items);
        setNewInventoryItems(Array.from(allMissingItems.values()));
        setActiveTab(allMissingItems.size > 0 ? 'inventory' : 'menu');
        setIsOpen(true);
      } catch (err) {
        console.error('Error parsing file:', err);
        setError('Failed to parse the file. Please check the format.');
      }
    };
    
    reader.readAsBinaryString(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validItems = parsedItems.filter(item => item.isValid);
    if (validItems.length === 0) {
      setError('No valid items to import');
      return;
    }
    
    try {
      // Filter inventory items that have cost > 0 or were from Excel
      const inventoryToCreate = newInventoryItems.filter(item => item.cost_price > 0 || item.fromExcel);
      
      await onImport(
        validItems.map(({ name, category, price, description, ingredients }) => ({
          name,
          category,
          price,
          description,
          ingredients,
        })),
        inventoryToCreate.length > 0 ? inventoryToCreate : undefined
      );
      setIsOpen(false);
      setParsedItems([]);
      setNewInventoryItems([]);
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import items');
    }
  };

  const handleDownloadTemplate = () => {
    // Create Menu sheet
    const menuData = [
      {
        name: 'Paneer Tikka',
        category: 'starters',
        price: 350,
        description: 'Grilled cottage cheese with spices',
        ingredients: 'paneer:200g,onion:20g,oil:20ml,red_chili:5g'
      },
      {
        name: 'Butter Naan',
        category: 'breads',
        price: 40,
        description: 'Soft butter naan',
        ingredients: 'maida:100g,butter:15g,milk:30ml,yeast:2g'
      },
      {
        name: 'Dal Makhani',
        category: 'main_course',
        price: 280,
        description: 'Creamy black lentils',
        ingredients: 'black_dal:150g,butter:30g,cream:50ml,tomato:100g'
      },
    ];

    // Create Inventory sheet (optional - for providing cost/unit details)
    const inventoryData = [
      { name: 'paneer', category: 'dairy', unit: 'kg', cost_price: 400, current_stock: 10, min_stock_level: 5 },
      { name: 'onion', category: 'vegetables', unit: 'kg', cost_price: 40, current_stock: 20, min_stock_level: 10 },
      { name: 'oil', category: 'oils', unit: 'l', cost_price: 180, current_stock: 15, min_stock_level: 5 },
      { name: 'red_chili', category: 'spices', unit: 'kg', cost_price: 300, current_stock: 2, min_stock_level: 1 },
      { name: 'maida', category: 'flour', unit: 'kg', cost_price: 50, current_stock: 25, min_stock_level: 10 },
      { name: 'butter', category: 'dairy', unit: 'kg', cost_price: 500, current_stock: 5, min_stock_level: 2 },
      { name: 'milk', category: 'dairy', unit: 'l', cost_price: 60, current_stock: 20, min_stock_level: 10 },
      { name: 'yeast', category: 'baking', unit: 'kg', cost_price: 200, current_stock: 1, min_stock_level: 0.5 },
      { name: 'black_dal', category: 'pulses', unit: 'kg', cost_price: 120, current_stock: 15, min_stock_level: 5 },
      { name: 'cream', category: 'dairy', unit: 'l', cost_price: 300, current_stock: 5, min_stock_level: 2 },
      { name: 'tomato', category: 'vegetables', unit: 'kg', cost_price: 40, current_stock: 15, min_stock_level: 5 },
    ];

    const wb = XLSX.utils.book_new();
    
    // Menu sheet
    const menuWs = XLSX.utils.json_to_sheet(menuData);
    menuWs['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, menuWs, 'Menu');
    
    // Inventory sheet
    const invWs = XLSX.utils.json_to_sheet(inventoryData);
    invWs['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, invWs, 'Inventory');
    
    XLSX.writeFile(wb, 'menu_import_template.xlsx');
  };

  const handleDownloadInventoryTemplate = () => {
    // Export current inventory as template
    const inventoryData = inventory.map(item => ({
      name: item.name,
      category: item.category,
      unit: item.unit,
      cost_price: item.cost_price,
      current_stock: item.current_stock,
      min_stock_level: item.min_stock_level,
      supplier: item.supplier || '',
      sku: item.sku || '',
    }));

    const ws = XLSX.utils.json_to_sheet(inventoryData);
    const wb = XLSX.utils.book_new();
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    
    XLSX.writeFile(wb, 'inventory_template.xlsx');
  };

  const updateInventoryItem = (index: number, field: keyof NewInventoryItem, value: any) => {
    setNewInventoryItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const validCount = parsedItems.filter(i => i.isValid).length;
  const invalidCount = parsedItems.length - validCount;
  const hasWarnings = parsedItems.some(i => i.warnings.length > 0);
  const missingCostCount = newInventoryItems.filter(i => i.cost_price <= 0).length;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="hidden"
      />
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={handleDownloadTemplate} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Menu Template
        </Button>
        <Button variant="outline" onClick={handleDownloadInventoryTemplate} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Inventory Template
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Import Menu (Excel)
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Import Menu Items with Auto-Inventory</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="menu" className="gap-2">
                <ChefHat className="h-4 w-4" />
                Menu Items ({validCount})
              </TabsTrigger>
              <TabsTrigger value="inventory" className="gap-2">
                <Package className="h-4 w-4" />
                New Inventory ({newInventoryItems.length})
                {missingCostCount > 0 && (
                  <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {missingCostCount} need cost
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="menu" className="space-y-4">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{validCount} valid items</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>{invalidCount} invalid items</span>
                  </div>
                )}
              </div>
              
              {hasWarnings && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Some items have notes. Missing inventory items will be auto-created.
                  </AlertDescription>
                </Alert>
              )}
              
              <ScrollArea className="h-[350px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Ingredients/Recipe</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedItems.map((item, idx) => (
                      <TableRow key={idx} className={!item.isValid ? 'bg-destructive/10' : ''}>
                        <TableCell className="font-medium">{item.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{currencySymbol}{item.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {item.ingredients.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.ingredients.slice(0, 3).map((ing, i) => (
                                  <Badge 
                                    key={i} 
                                    variant={ing.inventory_id ? 'secondary' : 'outline'}
                                    className={!ing.inventory_id ? 'border-amber-500 text-amber-700 dark:text-amber-400' : ''}
                                  >
                                    {ing.inventory_name}: {ing.quantity}{ing.unit}
                                  </Badge>
                                ))}
                                {item.ingredients.length > 3 && (
                                  <Badge variant="outline">+{item.ingredients.length - 3} more</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">No recipe</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.isValid ? (
                            item.warnings.length > 0 ? (
                              <div className="flex items-center gap-1" title={item.warnings.join('\n')}>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span className="text-xs text-amber-600">{item.warnings.length}</span>
                              </div>
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )
                          ) : (
                            <div className="flex items-center gap-1" title={item.warnings.join('\n')}>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-destructive">Invalid</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="inventory" className="space-y-4">
              {newInventoryItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>All ingredients already exist in inventory!</p>
                </div>
              ) : (
                <>
                  <Alert>
                    <Package className="h-4 w-4" />
                    <AlertDescription>
                      These items will be automatically added to inventory. Edit cost prices below for accurate recipe costing.
                      {missingCostCount > 0 && (
                        <span className="block mt-1 text-amber-600">
                          ⚠ {missingCostCount} item(s) have no cost - they will be created with cost = 0
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                  
                  <ScrollArea className="h-[350px] border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Cost Price ({currencySymbol})</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {newInventoryItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <input
                                type="text"
                                value={item.category}
                                onChange={(e) => updateInventoryItem(idx, 'category', e.target.value)}
                                className="w-24 px-2 py-1 text-sm border rounded bg-background"
                              />
                            </TableCell>
                            <TableCell>
                              <select
                                value={item.unit}
                                onChange={(e) => updateInventoryItem(idx, 'unit', e.target.value)}
                                className="w-16 px-1 py-1 text-sm border rounded bg-background"
                              >
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="l">L</option>
                                <option value="ml">ml</option>
                                <option value="pcs">pcs</option>
                                <option value="dozen">dozen</option>
                                <option value="pack">pack</option>
                              </select>
                            </TableCell>
                            <TableCell className="text-right">
                              <input
                                type="number"
                                value={item.cost_price}
                                onChange={(e) => updateInventoryItem(idx, 'cost_price', parseFloat(e.target.value) || 0)}
                                className={`w-24 px-2 py-1 text-sm border rounded text-right bg-background ${item.cost_price <= 0 ? 'border-amber-500' : ''}`}
                                placeholder="0.00"
                              />
                            </TableCell>
                            <TableCell>
                              {item.fromExcel ? (
                                <Badge variant="secondary" className="text-xs">From Excel</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Auto-detected</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              )}
            </TabsContent>
          </Tabs>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="font-medium mb-2">How it works:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Menu sheet:</strong> name, category, price, description, ingredients (format: ingredient:quantityunit)</li>
              <li><strong>Inventory sheet (optional):</strong> Pre-define inventory items with name, unit, cost_price</li>
              <li>Missing inventory items are auto-created with default values</li>
              <li>Later, download "Inventory Template" to update costs/stock in bulk</li>
            </ul>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={validCount === 0 || isLoading}>
              {isLoading ? 'Importing...' : `Import ${validCount} Menu + ${newInventoryItems.length} Inventory Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

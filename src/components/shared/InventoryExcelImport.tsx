import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertTriangle, Pencil, Save, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { normalizeUnit, isValidUnit } from '@/constants/inventoryUnits';

interface CategoryOption {
  value: string;
  label: string;
}

interface UnitOption {
  value: string;
  label: string;
}

interface InventoryItem {
  name: string;
  category: string;
  unit?: string;
  current_stock?: number;
  min_stock_level?: number;
  cost_price?: number;
  selling_price?: number;
  supplier?: string | null;
  sku?: string | null;
}

interface ParsedRow {
  data: Partial<InventoryItem>;
  errors: string[];
  isValid: boolean;
}

interface InventoryExcelImportProps {
  departmentName: string;
  categories: CategoryOption[];
  units: UnitOption[];
  onImport: (items: Partial<InventoryItem>[]) => void;
  isLoading?: boolean;
  hasSellingPrice?: boolean;
  hasSupplier?: boolean;
  hasSku?: boolean;
  onAddCategory?: (category: string) => void;
}

export function InventoryExcelImport({
  departmentName,
  categories,
  units,
  onImport,
  isLoading,
  hasSellingPrice = false,
  hasSupplier = false,
  hasSku = false,
  onAddCategory,
}: InventoryExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<Partial<InventoryItem>>({});
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    // Create sample data with multiple rows showing different categories
    const sampleData: Record<string, string | number | null>[] = [
      {
        name: 'Paneer',
        category: categories[0]?.value || 'other',
        unit: units[0]?.value || 'kg',
        current_stock: 10,
        min_stock_level: 5,
        cost_price: 300,
        ...(hasSellingPrice && { selling_price: 350 }),
        ...(hasSupplier && { supplier: 'Dairy Fresh Pvt Ltd' }),
        ...(hasSku && { sku: 'INV001' }),
      },
      {
        name: 'Onion',
        category: categories[1]?.value || categories[0]?.value || 'other',
        unit: units[0]?.value || 'kg',
        current_stock: 25,
        min_stock_level: 10,
        cost_price: 40,
        ...(hasSellingPrice && { selling_price: 50 }),
        ...(hasSupplier && { supplier: 'Fresh Farms' }),
        ...(hasSku && { sku: 'INV002' }),
      },
      {
        name: 'Cooking Oil',
        category: categories[2]?.value || categories[0]?.value || 'other',
        unit: units[1]?.value || units[0]?.value || 'ltr',
        current_stock: 20,
        min_stock_level: 10,
        cost_price: 180,
        ...(hasSellingPrice && { selling_price: 200 }),
        ...(hasSupplier && { supplier: 'Fortune Oils' }),
        ...(hasSku && { sku: 'INV003' }),
      },
      {
        name: 'Rice',
        category: categories[0]?.value || 'other',
        unit: units[0]?.value || 'kg',
        current_stock: 50,
        min_stock_level: 20,
        cost_price: 60,
        ...(hasSellingPrice && { selling_price: 75 }),
        ...(hasSupplier && { supplier: 'Grains Supplier Co' }),
        ...(hasSku && { sku: 'INV004' }),
      },
      {
        name: 'Butter',
        category: categories[1]?.value || categories[0]?.value || 'other',
        unit: units[0]?.value || 'kg',
        current_stock: 5,
        min_stock_level: 2,
        cost_price: 500,
        ...(hasSellingPrice && { selling_price: 550 }),
        ...(hasSupplier && { supplier: 'Amul Distributors' }),
        ...(hasSku && { sku: 'INV005' }),
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');

    // Set column widths for better readability
    const colWidths = [
      { wch: 20 }, // name
      { wch: 15 }, // category
      { wch: 10 }, // unit
      { wch: 15 }, // current_stock
      { wch: 15 }, // min_stock_level
      { wch: 12 }, // cost_price
    ];
    if (hasSellingPrice) colWidths.push({ wch: 12 }); // selling_price
    if (hasSupplier) colWidths.push({ wch: 25 }); // supplier
    if (hasSku) colWidths.push({ wch: 12 }); // sku
    
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `${departmentName.toLowerCase()}_inventory_template.xlsx`);
  };

  const validateRow = (data: Partial<InventoryItem>): string[] => {
    const errors: string[] = [];
    const validCategories = categories.map(c => c.value);
    const validUnitValues = units.map(u => u.value);

    if (!data.name?.trim()) errors.push('Name is required');
    if (data.category && !validCategories.includes(data.category)) {
      errors.push(`Invalid category: ${data.category}`);
    }
    if (data.unit) {
      const normalizedUnit = normalizeUnit(data.unit);
      if (!validUnitValues.includes(normalizedUnit) && !isValidUnit(data.unit)) {
        errors.push(`Invalid unit: ${data.unit}`);
      }
    }
    return errors;
  };

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const validCategories = categories.map(c => c.value);
    const validUnits = units.map(u => u.value);

    return lines.slice(1).map((line) => {
      const values = line.split(',').map(v => v.trim());
      const errors: string[] = [];
      const data: Partial<InventoryItem> = {};

      headers.forEach((header, i) => {
        const value = values[i] || '';

        switch (header) {
          case 'name':
            if (!value) errors.push('Name is required');
            data.name = value;
            break;
          case 'category':
            if (!validCategories.includes(value)) {
              errors.push(`Invalid category: ${value}`);
            }
            data.category = value;
            break;
          case 'unit':
            // Normalize the unit value (handles aliases like "kilogram" -> "kg")
            const normalizedUnit = normalizeUnit(value);
            const validUnitValues = units.map(u => u.value);
            if (value && !validUnitValues.includes(normalizedUnit) && !isValidUnit(value)) {
              errors.push(`Invalid unit: ${value}`);
            }
            data.unit = validUnitValues.includes(normalizedUnit) ? normalizedUnit : (units[0]?.value || 'pcs');
            break;
          case 'current_stock':
            const stock = parseFloat(value);
            if (value && isNaN(stock)) errors.push('Invalid stock number');
            data.current_stock = stock || 0;
            break;
          case 'min_stock_level':
            const min = parseFloat(value);
            data.min_stock_level = min || 5;
            break;
          case 'cost_price':
            const cost = parseFloat(value);
            if (value && isNaN(cost)) errors.push('Invalid cost price');
            data.cost_price = cost || 0;
            break;
          case 'selling_price':
            if (hasSellingPrice) {
              const sell = parseFloat(value);
              if (value && isNaN(sell)) errors.push('Invalid selling price');
              data.selling_price = sell || 0;
            }
            break;
          case 'supplier':
            if (hasSupplier) {
              data.supplier = value || null;
            }
            break;
          case 'sku':
            if (hasSku) {
              data.sku = value || null;
            }
            break;
        }
      });

      return {
        data,
        errors,
        isValid: errors.length === 0,
      };
    });
  };

  const parseExcelData = (data: Record<string, unknown>[]): ParsedRow[] => {
    const validCategories = categories.map(c => c.value);
    const validUnits = units.map(u => u.value);

    return data.map((row) => {
      const errors: string[] = [];
      const item: Partial<InventoryItem> = {};

      // Get name
      const name = String(row.name || row.Name || '').trim();
      if (!name) errors.push('Name is required');
      item.name = name;

      // Get category
      const category = String(row.category || row.Category || '').trim();
      if (category && !validCategories.includes(category)) {
        errors.push(`Invalid category: ${category}`);
      }
      item.category = category || categories[0]?.value || '';

      // Get unit - normalize to handle aliases
      const rawUnit = String(row.unit || row.Unit || '').trim();
      const normalizedUnit = normalizeUnit(rawUnit);
      if (rawUnit && !validUnits.includes(normalizedUnit) && !isValidUnit(rawUnit)) {
        errors.push(`Invalid unit: ${rawUnit}`);
      }
      item.unit = validUnits.includes(normalizedUnit) ? normalizedUnit : (units[0]?.value || 'pcs');

      // Parse numeric fields
      const currentStock = parseFloat(String(row.current_stock || row['Current Stock'] || 0));
      if (isNaN(currentStock)) errors.push('Invalid stock number');
      item.current_stock = isNaN(currentStock) ? 0 : currentStock;

      const minStock = parseFloat(String(row.min_stock_level || row['Min Stock Level'] || 5));
      item.min_stock_level = isNaN(minStock) ? 5 : minStock;

      const costPrice = parseFloat(String(row.cost_price || row['Cost Price'] || 0));
      if (isNaN(costPrice)) errors.push('Invalid cost price');
      item.cost_price = isNaN(costPrice) ? 0 : costPrice;

      if (hasSellingPrice) {
        const sellingPrice = parseFloat(String(row.selling_price || row['Selling Price'] || 0));
        item.selling_price = isNaN(sellingPrice) ? 0 : sellingPrice;
      }

      if (hasSupplier) {
        item.supplier = String(row.supplier || row.Supplier || '').trim() || null;
      }

      if (hasSku) {
        item.sku = String(row.sku || row.SKU || '').trim() || null;
      }

      return {
        data: item,
        errors,
        isValid: errors.length === 0,
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const reader = new FileReader();
    reader.onload = (event) => {
      let parsed: ParsedRow[];

      if (isExcel) {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
        parsed = parseExcelData(jsonData);
      } else {
        const text = event.target?.result as string;
        parsed = parseCSV(text);
      }

      setParsedData(parsed);
      setIsOpen(true);
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingData({ ...parsedData[index].data });
  };

  const handleSaveEdit = (index: number) => {
    const errors = validateRow(editingData);
    const updatedData = [...parsedData];
    updatedData[index] = {
      data: { ...editingData },
      errors,
      isValid: errors.length === 0,
    };
    setParsedData(updatedData);
    setEditingIndex(null);
    setEditingData({});
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingData({});
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && onAddCategory) {
      onAddCategory(newCategoryName.trim().toLowerCase());
      toast({ title: `Category "${newCategoryName}" added` });
      setNewCategoryName('');
      setShowAddCategoryDialog(false);
    }
  };

  const handleImport = () => {
    const validItems = parsedData.filter(row => row.isValid).map(row => row.data);
    if (validItems.length === 0) {
      toast({ title: 'No valid items to import', variant: 'destructive' });
      return;
    }
    onImport(validItems);
    setIsOpen(false);
    setParsedData([]);
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <>
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import from Excel/CSV
          </CardTitle>
          <CardDescription>
            Upload an Excel or CSV file to bulk import {departmentName.toLowerCase()} inventory
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button className="flex-1" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
          {onAddCategory && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowAddCategoryDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Category
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">
            Supported formats: XLSX, XLS, CSV, TXT
          </p>
        </CardContent>
      </Card>

      {/* Import Preview Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Preview - {fileName}</DialogTitle>
            <DialogDescription>
              Review and edit the data before importing. Click the edit icon to fix invalid rows.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 py-2">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              {validCount} Valid
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                <XCircle className="h-3 w-3 mr-1" />
                {invalidCount} Invalid
              </Badge>
            )}
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  {hasSellingPrice && <TableHead className="text-right">Price</TableHead>}
                  <TableHead>Errors</TableHead>
                  <TableHead className="w-20 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.map((row, index) => (
                  <TableRow key={index} className={!row.isValid ? 'bg-destructive/10' : ''}>
                    {editingIndex === index ? (
                      // Editing mode
                      <>
                        <TableCell>
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editingData.name || ''}
                            onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                            className="h-8 w-full"
                            placeholder="Item name"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editingData.category || ''}
                            onValueChange={(v) => setEditingData({ ...editingData, category: v })}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editingData.unit || ''}
                            onValueChange={(v) => setEditingData({ ...editingData, unit: v })}
                          >
                            <SelectTrigger className="h-8 w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {units.map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editingData.current_stock || 0}
                            onChange={(e) => setEditingData({ ...editingData, current_stock: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-20 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editingData.cost_price || 0}
                            onChange={(e) => setEditingData({ ...editingData, cost_price: parseFloat(e.target.value) || 0 })}
                            className="h-8 w-20 text-right"
                          />
                        </TableCell>
                        {hasSellingPrice && (
                          <TableCell>
                            <Input
                              type="number"
                              value={editingData.selling_price || 0}
                              onChange={(e) => setEditingData({ ...editingData, selling_price: parseFloat(e.target.value) || 0 })}
                              className="h-8 w-20 text-right"
                            />
                          </TableCell>
                        )}
                        <TableCell>-</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveEdit(index)}>
                              <Save className="h-4 w-4 text-emerald-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      // View mode
                      <>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{row.data.name || '-'}</TableCell>
                        <TableCell>{row.data.category || '-'}</TableCell>
                        <TableCell>{row.data.unit || '-'}</TableCell>
                        <TableCell className="text-right">{row.data.current_stock || 0}</TableCell>
                        <TableCell className="text-right">{row.data.cost_price || 0}</TableCell>
                        {hasSellingPrice && (
                          <TableCell className="text-right">{row.data.selling_price || 0}</TableCell>
                        )}
                        <TableCell>
                          {row.errors.length > 0 && (
                            <span className="text-xs text-destructive">{row.errors.join(', ')}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {!row.isValid && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7" 
                              onClick={() => handleStartEdit(index)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={validCount === 0 || isLoading}>
              Import {validCount} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Enter a name for the new inventory category
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Category name (e.g., beverages, frozen)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
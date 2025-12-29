import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { BarInventory, INVENTORY_CATEGORIES, INVENTORY_UNITS } from '@/types/bar';
import { normalizeUnit, isValidUnit } from '@/constants/inventoryUnits';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  onImport: (items: Partial<BarInventory>[]) => void;
  isLoading?: boolean;
}

interface ParsedRow {
  data: Partial<BarInventory>;
  errors: string[];
  isValid: boolean;
}

export function ExcelImport({ onImport, isLoading }: ExcelImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const sampleData = [
      { name: 'Jack Daniels', category: 'spirits', unit: 'bottle', current_stock: 10, min_stock_level: 5, cost_price: 2500, selling_price: 350, supplier: 'ABC Distributors', sku: 'JD001' },
      { name: 'Kingfisher Premium', category: 'beer', unit: 'can', current_stock: 48, min_stock_level: 12, cost_price: 80, selling_price: 150, supplier: 'UB Group', sku: 'KF001' },
      { name: 'Red Bull', category: 'mixer', unit: 'can', current_stock: 24, min_stock_level: 6, cost_price: 85, selling_price: 150, supplier: 'Energy Drinks Ltd', sku: 'RB001' },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bar Inventory Template');
    ws['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 14 },
      { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 12 }
    ];
    XLSX.writeFile(wb, 'bar_inventory_template.xlsx');
  };

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const validCategories = INVENTORY_CATEGORIES.map(c => c.value) as string[];
    const validUnits = INVENTORY_UNITS.map(u => u.value) as string[];

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const errors: string[] = [];
      
      const data: Partial<BarInventory> = {};
      
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
            // Normalize the unit value
            const normalizedUnit = normalizeUnit(value);
            if (value && !validUnits.includes(normalizedUnit) && !isValidUnit(value)) {
              errors.push(`Invalid unit: ${value}`);
            }
            data.unit = validUnits.includes(normalizedUnit) ? normalizedUnit : 'bottle';
            break;
          case 'current_stock':
            const stock = parseFloat(value);
            if (isNaN(stock)) errors.push('Invalid stock number');
            data.current_stock = stock || 0;
            break;
          case 'min_stock_level':
            const min = parseFloat(value);
            data.min_stock_level = min || 5;
            break;
          case 'cost_price':
            const cost = parseFloat(value);
            if (isNaN(cost)) errors.push('Invalid cost price');
            data.cost_price = cost || 0;
            break;
          case 'selling_price':
            const sell = parseFloat(value);
            if (isNaN(sell)) errors.push('Invalid selling price');
            data.selling_price = sell || 0;
            break;
          case 'supplier':
            data.supplier = value || null;
            break;
          case 'sku':
            data.sku = value || null;
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
    const validCategories = INVENTORY_CATEGORIES.map(c => c.value) as string[];
    const validUnits = INVENTORY_UNITS.map(u => u.value) as string[];

    return data.map((row) => {
      const errors: string[] = [];
      const item: Partial<BarInventory> = {};

      const name = String(row.name || row.Name || '').trim();
      if (!name) errors.push('Name is required');
      item.name = name;

      const category = String(row.category || row.Category || '').trim();
      if (category && !validCategories.includes(category)) {
        errors.push(`Invalid category: ${category}`);
      }
      item.category = category || 'spirits';

      const rawUnit = String(row.unit || row.Unit || '').trim();
      const normalizedUnit = normalizeUnit(rawUnit);
      if (rawUnit && !validUnits.includes(normalizedUnit) && !isValidUnit(rawUnit)) {
        errors.push(`Invalid unit: ${rawUnit}`);
      }
      item.unit = validUnits.includes(normalizedUnit) ? normalizedUnit : 'bottle';

      item.current_stock = parseFloat(String(row.current_stock || row['Current Stock'] || 0)) || 0;
      item.min_stock_level = parseFloat(String(row.min_stock_level || row['Min Stock Level'] || 5)) || 5;
      item.cost_price = parseFloat(String(row.cost_price || row['Cost Price'] || 0)) || 0;
      item.selling_price = parseFloat(String(row.selling_price || row['Selling Price'] || 0)) || 0;
      item.supplier = String(row.supplier || row.Supplier || '').trim() || null;
      item.sku = String(row.sku || row.SKU || '').trim() || null;

      return { data: item, errors, isValid: errors.length === 0 };
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
            Upload a CSV file to bulk import inventory items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Preview - {fileName}</DialogTitle>
            <DialogDescription>
              Review the data before importing. Invalid rows will be skipped.
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

          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.map((row, index) => (
                  <TableRow key={index} className={!row.isValid ? 'bg-destructive/10' : ''}>
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
                    <TableCell className="text-right">{row.data.selling_price || 0}</TableCell>
                    <TableCell>
                      {row.errors.length > 0 && (
                        <span className="text-xs text-destructive">
                          {row.errors.join(', ')}
                        </span>
                      )}
                    </TableCell>
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
    </>
  );
}

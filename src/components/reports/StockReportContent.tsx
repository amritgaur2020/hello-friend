import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Package, AlertTriangle, CheckCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface StockReportContentProps {
  inventory: any[];
  currencySymbol: string;
  department: string;
}

export function StockReportContent({ 
  inventory, 
  currencySymbol, 
  department 
}: StockReportContentProps) {
  const totalItems = inventory.length;
  const totalStockValue = inventory.reduce((sum, item) => 
    sum + ((item.current_stock || 0) * (item.cost_price || 0)), 0
  );
  const lowStockItems = inventory.filter(item => 
    (item.current_stock || 0) <= (item.min_stock || item.min_stock_level || 10)
  );
  const outOfStockItems = inventory.filter(item => (item.current_stock || 0) === 0);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${department} Stock Report`, 14, 22);
    
    autoTable(doc, {
      startY: 35,
      head: [["Item", "Category", "Current Stock", "Min Stock", "Status", "Value"]],
      body: inventory.map(item => [
        item.name,
        item.category || "-",
        `${item.current_stock || 0} ${item.unit || ""}`,
        item.min_stock || item.min_stock_level || 10,
        (item.current_stock || 0) <= (item.min_stock || item.min_stock_level || 10) ? "Low" : "OK",
        `${currencySymbol}${((item.current_stock || 0) * (item.cost_price || 0)).toFixed(2)}`,
      ]),
    });
    
    doc.save(`${department}_Stock_Report.pdf`);
  };

  const exportExcel = () => {
    const data = inventory.map(item => ({
      Name: item.name,
      Category: item.category || "-",
      "Current Stock": item.current_stock || 0,
      Unit: item.unit || "",
      "Min Stock": item.min_stock || item.min_stock_level || 10,
      "Cost Price": item.cost_price || 0,
      "Stock Value": (item.current_stock || 0) * (item.cost_price || 0),
      Status: (item.current_stock || 0) <= (item.min_stock || item.min_stock_level || 10) ? "Low Stock" : "OK",
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Report");
    XLSX.writeFile(wb, `${department}_Stock_Report.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stock Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {currencySymbol}{totalStockValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Package className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-destructive">{outOfStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inventory Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="text-center">Min Stock</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => {
                    const isLowStock = (item.current_stock || 0) <= (item.min_stock || item.min_stock_level || 10);
                    const isOutOfStock = (item.current_stock || 0) === 0;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.category || "-"}</TableCell>
                        <TableCell className="text-center">
                          {item.current_stock || 0} {item.unit || ""}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {item.min_stock || item.min_stock_level || 10}
                        </TableCell>
                        <TableCell className="text-center">
                          {isOutOfStock ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLowStock ? (
                            <Badge variant="outline" className="border-orange-500 text-orange-600">
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {currencySymbol}{((item.current_stock || 0) * (item.cost_price || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

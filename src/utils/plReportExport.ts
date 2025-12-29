import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { DepartmentPLData, HotelPLSummary, InventoryValuation, LowStockItem } from '@/hooks/useHotelPLData';
import { Forecast } from '@/utils/forecastingUtils';

interface ExportData {
  summary: HotelPLSummary;
  departments: DepartmentPLData[];
  inventoryValuation: InventoryValuation[];
  lowStockItems: LowStockItem[];
  forecast: Forecast;
  expenses?: { category: string; amount: number }[];
  frontOffice?: { checkIns: number; checkOuts: number; revenue: number };
  dateRange: { start: Date; end: Date };
  hotelName?: string;
  currencySymbol: string;
}

export function exportToPDF(data: ExportData): void {
  const doc = new jsPDF();
  const { summary, departments, inventoryValuation, lowStockItems, forecast, expenses, frontOffice, dateRange, hotelName, currencySymbol } = data;
  
  const formatCurrency = (value: number) => `${currencySymbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(hotelName || 'Hotel P/L Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`, 14, 30);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 36);
  
  // Executive Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, 48);
  
  const summaryData = [
    ['Total Revenue', formatCurrency(summary.totalRevenue)],
    ['Total COGS', formatCurrency(summary.totalCOGS)],
    ['Gross Profit', formatCurrency(summary.grossProfit)],
    ['Gross Margin', `${summary.grossMargin.toFixed(1)}%`],
    ['Net Profit', formatCurrency(summary.netProfit)],
    ['Total Orders', summary.totalOrders.toString()],
    ['Avg Order Value', formatCurrency(summary.avgOrderValue)],
  ];
  
  autoTable(doc, {
    startY: 52,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Department Performance
  let yPos = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Department Performance', 14, yPos);
  
  const deptData = departments.map(d => [
    d.displayName,
    formatCurrency(d.revenue),
    formatCurrency(d.cogs),
    formatCurrency(d.grossProfit),
    `${d.margin.toFixed(1)}%`,
    d.orderCount.toString(),
  ]);
  
  autoTable(doc, {
    startY: yPos + 4,
    head: [['Department', 'Revenue', 'COGS', 'Profit', 'Margin', 'Orders']],
    body: deptData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Front Office (if available)
  if (frontOffice && frontOffice.revenue > 0) {
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Front Office Summary', 14, yPos);
    
    autoTable(doc, {
      startY: yPos + 4,
      head: [['Metric', 'Value']],
      body: [
        ['Check-ins', frontOffice.checkIns.toString()],
        ['Check-outs', frontOffice.checkOuts.toString()],
        ['Room Revenue', formatCurrency(frontOffice.revenue)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
    });
  }
  
  // Expenses (if available)
  if (expenses && expenses.length > 0) {
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Operating Expenses', 14, yPos);
    
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseData = [
      ...expenses.map(e => [e.category, formatCurrency(e.amount)]),
      ['Total Expenses', formatCurrency(expenseTotal)],
    ];
    
    autoTable(doc, {
      startY: yPos + 4,
      head: [['Category', 'Amount']],
      body: expenseData,
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68] },
    });
  }
  
  // Inventory Valuation
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Inventory Valuation', 14, yPos);
  
  const invData = inventoryValuation.map(iv => [
    iv.displayName,
    formatCurrency(iv.totalValue),
    iv.itemCount.toString(),
    iv.lowStockCount.toString(),
  ]);
  
  autoTable(doc, {
    startY: yPos + 4,
    head: [['Department', 'Value', 'Items', 'Low Stock']],
    body: invData,
    theme: 'striped',
    headStyles: { fillColor: [168, 85, 247] },
  });
  
  // Forecast
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue Forecast', 14, yPos);
  
  autoTable(doc, {
    startY: yPos + 4,
    head: [['Metric', 'Value']],
    body: [
      ['Projected Revenue', formatCurrency(forecast.projectedRevenue)],
      ['Projected COGS', formatCurrency(forecast.projectedCOGS)],
      ['Projected Profit', formatCurrency(forecast.projectedProfit)],
      ['Growth Rate', `${forecast.growthRate.toFixed(1)}%`],
      ['Trend', forecast.trendDirection],
      ['Confidence', forecast.confidence],
    ],
    theme: 'striped',
    headStyles: { fillColor: [14, 165, 233] },
  });
  
  // Low Stock Items (if any)
  if (lowStockItems.length > 0) {
    doc.addPage();
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Low Stock Alerts', 14, 20);
    
    const lowStockData = lowStockItems.slice(0, 20).map(item => [
      item.name,
      item.department,
      `${item.currentStock} ${item.unit}`,
      `${item.minStockLevel} ${item.unit}`,
      `${item.percentBelowMin.toFixed(0)}%`,
    ]);
    
    autoTable(doc, {
      startY: 24,
      head: [['Item', 'Department', 'Current', 'Min Required', 'Below %']],
      body: lowStockData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });
  }
  
  // Save PDF
  doc.save(`PL-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportToExcel(data: ExportData): void {
  const { summary, departments, inventoryValuation, lowStockItems, forecast, expenses, frontOffice, dateRange, currencySymbol } = data;
  
  const workbook = XLSX.utils.book_new();
  
  // Summary Sheet
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Hotel P/L Report'],
    [`Period: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`],
    [''],
    ['Executive Summary'],
    ['Metric', 'Value'],
    ['Total Revenue', summary.totalRevenue],
    ['Total COGS', summary.totalCOGS],
    ['Gross Profit', summary.grossProfit],
    ['Gross Margin %', summary.grossMargin],
    ['Net Profit', summary.netProfit],
    ['Net Margin %', summary.netMargin],
    ['Total Orders', summary.totalOrders],
    ['Avg Order Value', summary.avgOrderValue],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Department Performance Sheet
  const deptHeaders = ['Department', 'Revenue', 'COGS', 'Gross Profit', 'Margin %', 'Orders', 'Avg Order', 'Trend %'];
  const deptRows = departments.map(d => [
    d.displayName,
    d.revenue,
    d.cogs,
    d.grossProfit,
    d.margin,
    d.orderCount,
    d.avgOrderValue,
    d.trend,
  ]);
  const deptSheet = XLSX.utils.aoa_to_sheet([deptHeaders, ...deptRows]);
  XLSX.utils.book_append_sheet(workbook, deptSheet, 'Departments');
  
  // Front Office Sheet (if available)
  if (frontOffice && frontOffice.revenue > 0) {
    const foSheet = XLSX.utils.aoa_to_sheet([
      ['Front Office Summary'],
      ['Metric', 'Value'],
      ['Check-ins', frontOffice.checkIns],
      ['Check-outs', frontOffice.checkOuts],
      ['Room Revenue', frontOffice.revenue],
    ]);
    XLSX.utils.book_append_sheet(workbook, foSheet, 'Front Office');
  }
  
  // Expenses Sheet (if available)
  if (expenses && expenses.length > 0) {
    const expHeaders = ['Category', 'Amount'];
    const expRows = expenses.map(e => [e.category, e.amount]);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    expRows.push(['Total', expTotal]);
    const expSheet = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
    XLSX.utils.book_append_sheet(workbook, expSheet, 'Expenses');
  }
  
  // Inventory Sheet
  const invHeaders = ['Department', 'Total Value', 'Item Count', 'Low Stock Count'];
  const invRows = inventoryValuation.map(iv => [
    iv.displayName,
    iv.totalValue,
    iv.itemCount,
    iv.lowStockCount,
  ]);
  const invSheet = XLSX.utils.aoa_to_sheet([invHeaders, ...invRows]);
  XLSX.utils.book_append_sheet(workbook, invSheet, 'Inventory');
  
  // Low Stock Sheet
  if (lowStockItems.length > 0) {
    const lowHeaders = ['Item', 'Department', 'Current Stock', 'Min Level', 'Unit', 'Below Min %'];
    const lowRows = lowStockItems.map(item => [
      item.name,
      item.department,
      item.currentStock,
      item.minStockLevel,
      item.unit,
      item.percentBelowMin,
    ]);
    const lowSheet = XLSX.utils.aoa_to_sheet([lowHeaders, ...lowRows]);
    XLSX.utils.book_append_sheet(workbook, lowSheet, 'Low Stock');
  }
  
  // Forecast Sheet
  const forecastSheet = XLSX.utils.aoa_to_sheet([
    ['Revenue Forecast'],
    ['Metric', 'Value'],
    ['Projected Revenue', forecast.projectedRevenue],
    ['Projected COGS', forecast.projectedCOGS],
    ['Projected Profit', forecast.projectedProfit],
    ['Growth Rate %', forecast.growthRate],
    ['Trend Direction', forecast.trendDirection],
    ['Confidence', forecast.confidence],
    [''],
    ['Daily Projections'],
    ['Date', 'Revenue', 'Profit'],
    ...forecast.dailyProjections.map(p => [format(new Date(p.date), 'yyyy-MM-dd'), p.revenue, p.profit]),
  ]);
  XLSX.utils.book_append_sheet(workbook, forecastSheet, 'Forecast');
  
  // Day of Week Analysis
  if (forecast.dayOfWeekAnalysis.length > 0) {
    const dowSheet = XLSX.utils.aoa_to_sheet([
      ['Day of Week Analysis'],
      ['Day', 'Avg Revenue', 'Avg Orders'],
      ...forecast.dayOfWeekAnalysis.map(d => [d.day, d.avgRevenue, d.avgOrders]),
    ]);
    XLSX.utils.book_append_sheet(workbook, dowSheet, 'Day Analysis');
  }
  
  // Save Excel file
  XLSX.writeFile(workbook, `PL-Report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

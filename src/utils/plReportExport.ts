import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { DepartmentPLData, HotelPLSummary, InventoryValuation, LowStockItem } from '@/hooks/useHotelPLData';
import { Forecast } from '@/utils/forecastingUtils';
import { Expense } from '@/hooks/useExpenseTracking';
import { BudgetComparison } from '@/hooks/useBudgetTargets';

// Color palette matching the UI (converted to RGB for jsPDF)
const COLORS = {
  chart1: [59, 130, 246],   // Blue
  chart2: [34, 197, 94],    // Green
  chart3: [249, 115, 22],   // Orange
  chart4: [139, 92, 246],   // Purple
  chart5: [236, 72, 153],   // Pink
  chart6: [234, 179, 8],    // Yellow
  chart7: [20, 184, 166],   // Teal
  primary: [249, 115, 22],  // Primary orange
  success: [34, 197, 94],
  warning: [245, 158, 11],
  danger: [239, 68, 68],
  muted: [100, 116, 139],
} as const;

interface ExportData {
  summary: HotelPLSummary;
  departments: DepartmentPLData[];
  inventoryValuation: InventoryValuation[];
  lowStockItems: LowStockItem[];
  forecast: Forecast;
  expenses?: Expense[];
  expenseBreakdown?: { category: string; amount: number }[];
  departmentExpenses?: { department: string; displayName: string; total: number }[];
  budgetComparisons?: BudgetComparison[];
  frontOffice?: { checkIns: number; checkOuts: number; revenue: number };
  dateRange: { start: Date; end: Date };
  hotelName?: string;
  currencySymbol: string;
}

export function exportToPDF(data: ExportData): void {
  const doc = new jsPDF();
  const { summary, departments, inventoryValuation, lowStockItems, forecast, expenses, expenseBreakdown, departmentExpenses, budgetComparisons, frontOffice, dateRange, hotelName, currencySymbol } = data;
  
  const formatCurrency = (value: number) => `${currencySymbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header with branding
  doc.setFillColor(249, 115, 22); // Primary orange
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(hotelName || 'Hotel P/L Report', 14, 20);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`, 14, 28);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth - 14 - doc.getTextWidth(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`), 28);
  
  doc.setTextColor(0, 0, 0);
  
  // Executive Summary Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 34, 34);
  doc.text('Executive Summary', 14, 48);
  
  const summaryData = [
    ['Total Revenue', formatCurrency(summary.totalRevenue)],
    ['Total COGS', formatCurrency(summary.totalCOGS)],
    ['Total Tax', formatCurrency(summary.totalTax)],
    ['Gross Profit', formatCurrency(summary.grossProfit)],
    ['Gross Margin', `${summary.grossMargin.toFixed(1)}%`],
    ['Net Profit', formatCurrency(summary.netProfit)],
    ['Net Margin', `${summary.netMargin.toFixed(1)}%`],
    ['Total Orders', summary.totalOrders.toString()],
    ['Avg Order Value', formatCurrency(summary.avgOrderValue)],
  ];
  
  autoTable(doc, {
    startY: 52,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.chart1 as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { halign: 'right', cellWidth: 60 },
    },
  });
  
  // Department Performance
  let yPos = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Department Performance', 14, yPos);
  
  const deptColors = [COLORS.chart1, COLORS.chart2, COLORS.chart3, COLORS.chart4, COLORS.chart5, COLORS.chart6, COLORS.chart7];
  
  const deptData = departments.map((d, i) => [
    { content: d.displayName, styles: { textColor: deptColors[i % deptColors.length] as [number, number, number], fontStyle: 'bold' as const } },
    formatCurrency(d.revenue),
    formatCurrency(d.cogs),
    formatCurrency(d.tax),
    formatCurrency(d.grossProfit),
    formatCurrency(d.netProfit),
    `${d.margin.toFixed(1)}%`,
    d.orderCount.toString(),
  ]);
  
  autoTable(doc, {
    startY: yPos + 4,
    head: [['Department', 'Revenue', 'COGS', 'Tax', 'Gross Profit', 'Net Profit', 'Margin', 'Orders']],
    body: deptData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.chart2 as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', textColor: COLORS.success as [number, number, number] },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
  });
  
  // Front Office (if available)
  if (frontOffice && frontOffice.revenue > 0) {
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
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
      headStyles: { fillColor: COLORS.chart3 as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 10, cellPadding: 4 },
    });
  }
  
  // Expenses Section
  if (expenseBreakdown && expenseBreakdown.length > 0) {
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Operating Expenses', 14, yPos);
    
    const expenseTotal = expenseBreakdown.reduce((sum, e) => sum + e.amount, 0);
    const expenseData = [
      ...expenseBreakdown.map((e, i) => [
        { content: e.category.charAt(0).toUpperCase() + e.category.slice(1), styles: { textColor: deptColors[i % deptColors.length] as [number, number, number] } },
        formatCurrency(e.amount),
        `${((e.amount / expenseTotal) * 100).toFixed(1)}%`,
      ]),
      [{ content: 'Total Expenses', styles: { fontStyle: 'bold' as const } }, { content: formatCurrency(expenseTotal), styles: { fontStyle: 'bold' as const } }, { content: '100%', styles: { fontStyle: 'bold' as const } }],
    ];
    
    autoTable(doc, {
      startY: yPos + 4,
      head: [['Category', 'Amount', '% of Total']],
      body: expenseData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 245, 245] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    });
  }
  
  // Department Expense Allocation
  if (departmentExpenses && departmentExpenses.length > 0) {
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Department Expense Allocation', 14, yPos);
    
    const deptExpTotal = departmentExpenses.reduce((sum, d) => sum + d.total, 0);
    const deptExpData = departmentExpenses.map((d, i) => [
      { content: d.displayName, styles: { textColor: deptColors[i % deptColors.length] as [number, number, number] } },
      formatCurrency(d.total),
      `${((d.total / deptExpTotal) * 100).toFixed(1)}%`,
    ]);
    
    autoTable(doc, {
      startY: yPos + 4,
      head: [['Department', 'Total Expenses', '% of Total']],
      body: deptExpData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.chart4 as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    });
  }
  
  // Budget vs Actual (if available)
  if (budgetComparisons && budgetComparisons.some(bc => bc.revenueTarget > 0)) {
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Budget vs Actual', 14, yPos);
    
    const budgetData = budgetComparisons
      .filter(bc => bc.revenueTarget > 0)
      .map((bc, i) => [
        { content: bc.displayName, styles: { textColor: deptColors[i % deptColors.length] as [number, number, number] } },
        formatCurrency(bc.revenueTarget),
        formatCurrency(bc.revenueActual),
        { 
          content: `${bc.revenuePercent.toFixed(0)}%`, 
          styles: { textColor: (bc.revenuePercent >= 90 ? COLORS.success : bc.revenuePercent >= 70 ? COLORS.warning : COLORS.danger) as [number, number, number] } 
        },
        formatCurrency(bc.profitTarget),
        formatCurrency(bc.profitActual),
        { 
          content: `${bc.profitPercent.toFixed(0)}%`, 
          styles: { textColor: (bc.profitPercent >= 90 ? COLORS.success : bc.profitPercent >= 70 ? COLORS.warning : COLORS.danger) as [number, number, number] } 
        },
      ]);
    
    autoTable(doc, {
      startY: yPos + 4,
      head: [['Department', 'Rev Target', 'Rev Actual', 'Rev %', 'Profit Target', 'Profit Actual', 'Profit %']],
      body: budgetData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.chart5 as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
    });
  }
  
  // Inventory Valuation
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Inventory Valuation', 14, yPos);
  
  const invData = inventoryValuation.map((iv, i) => [
    { content: iv.displayName, styles: { textColor: deptColors[i % deptColors.length] as [number, number, number] } },
    formatCurrency(iv.totalValue),
    iv.itemCount.toString(),
    { content: iv.lowStockCount.toString(), styles: { textColor: (iv.lowStockCount > 0 ? COLORS.danger : COLORS.success) as [number, number, number] } },
  ]);
  
  autoTable(doc, {
    startY: yPos + 4,
    head: [['Department', 'Value', 'Items', 'Low Stock']],
    body: invData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.chart6 as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  });
  
  // Forecast
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Revenue Forecast', 14, yPos);
  
  autoTable(doc, {
    startY: yPos + 4,
    head: [['Metric', 'Value']],
    body: [
      ['Projected Revenue', formatCurrency(forecast.projectedRevenue)],
      ['Projected COGS', formatCurrency(forecast.projectedCOGS)],
      ['Projected Profit', { content: formatCurrency(forecast.projectedProfit), styles: { textColor: COLORS.success as [number, number, number] } }],
      ['Growth Rate', `${forecast.growthRate.toFixed(1)}%`],
      ['Trend', forecast.trendDirection.charAt(0).toUpperCase() + forecast.trendDirection.slice(1)],
      ['Confidence', forecast.confidence.charAt(0).toUpperCase() + forecast.confidence.slice(1)],
    ],
    theme: 'striped',
    headStyles: { fillColor: COLORS.chart7 as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      1: { halign: 'right' },
    },
  });
  
  // Low Stock Items (if any)
  if (lowStockItems.length > 0) {
    doc.addPage();
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Low Stock Alerts', 14, 20);
    
    const lowStockData = lowStockItems.slice(0, 25).map(item => [
      item.name,
      item.department,
      `${item.currentStock} ${item.unit}`,
      `${item.minStockLevel} ${item.unit}`,
      { content: `${item.percentBelowMin.toFixed(0)}% below`, styles: { textColor: COLORS.danger as [number, number, number] } },
    ]);
    
    autoTable(doc, {
      startY: 24,
      head: [['Item', 'Department', 'Current', 'Min Required', 'Status']],
      body: lowStockData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.warning as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      styles: { fontSize: 9, cellPadding: 3 },
    });
  }
  
  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    doc.text(hotelName || 'Hotel P/L Report', 14, doc.internal.pageSize.getHeight() - 10);
    doc.text(format(new Date(), 'MMM dd, yyyy'), pageWidth - 14 - doc.getTextWidth(format(new Date(), 'MMM dd, yyyy')), doc.internal.pageSize.getHeight() - 10);
  }
  
  // Save PDF
  doc.save(`PL-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportToExcel(data: ExportData): void {
  const { summary, departments, inventoryValuation, lowStockItems, forecast, expenses, expenseBreakdown, departmentExpenses, budgetComparisons, frontOffice, dateRange, hotelName, currencySymbol } = data;
  
  const workbook = XLSX.utils.book_new();
  
  // Summary Sheet
  const summarySheet = XLSX.utils.aoa_to_sheet([
    [hotelName || 'Hotel P/L Report'],
    [`Period: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`],
    [''],
    ['Executive Summary'],
    ['Metric', 'Value'],
    ['Total Revenue', summary.totalRevenue],
    ['Total COGS', summary.totalCOGS],
    ['Total Tax', summary.totalTax],
    ['Gross Profit', summary.grossProfit],
    ['Gross Margin %', summary.grossMargin],
    ['Net Profit', summary.netProfit],
    ['Net Margin %', summary.netMargin],
    ['Total Orders', summary.totalOrders],
    ['Avg Order Value', summary.avgOrderValue],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Department Performance Sheet
  const deptHeaders = ['Department', 'Revenue', 'COGS', 'Tax', 'Gross Profit', 'Net Profit', 'Margin %', 'Orders', 'Avg Order', 'Trend %'];
  const deptRows = departments.map(d => [
    d.displayName,
    d.revenue,
    d.cogs,
    d.tax,
    d.grossProfit,
    d.netProfit,
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
  
  // Expenses Sheet (detailed)
  if (expenses && expenses.length > 0) {
    const expHeaders = ['Date', 'Category', 'Department', 'Description', 'Amount', 'Recurring'];
    const expRows = expenses.map(e => [
      e.date,
      e.category.charAt(0).toUpperCase() + e.category.slice(1),
      e.department || 'General',
      e.description,
      e.amount,
      e.recurring ? 'Yes' : 'No',
    ]);
    const expSheet = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
    XLSX.utils.book_append_sheet(workbook, expSheet, 'Expense Details');
  }
  
  // Expense Breakdown Sheet
  if (expenseBreakdown && expenseBreakdown.length > 0) {
    const expTotal = expenseBreakdown.reduce((sum, e) => sum + e.amount, 0);
    const breakdownHeaders = ['Category', 'Amount', '% of Total'];
    const breakdownRows = expenseBreakdown.map(e => [
      e.category.charAt(0).toUpperCase() + e.category.slice(1),
      e.amount,
      ((e.amount / expTotal) * 100).toFixed(1),
    ]);
    breakdownRows.push(['Total', expTotal, 100]);
    const breakdownSheet = XLSX.utils.aoa_to_sheet([breakdownHeaders, ...breakdownRows]);
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Expense Summary');
  }
  
  // Department Expenses Sheet
  if (departmentExpenses && departmentExpenses.length > 0) {
    const deptExpHeaders = ['Department', 'Total Expenses'];
    const deptExpRows = departmentExpenses.map(d => [d.displayName, d.total]);
    const deptExpSheet = XLSX.utils.aoa_to_sheet([deptExpHeaders, ...deptExpRows]);
    XLSX.utils.book_append_sheet(workbook, deptExpSheet, 'Dept Expenses');
  }
  
  // Budget vs Actual Sheet
  if (budgetComparisons && budgetComparisons.some(bc => bc.revenueTarget > 0)) {
    const budgetHeaders = ['Department', 'Revenue Target', 'Revenue Actual', 'Revenue %', 'Revenue Variance', 'COGS Target', 'COGS Actual', 'COGS %', 'Profit Target', 'Profit Actual', 'Profit %'];
    const budgetRows = budgetComparisons
      .filter(bc => bc.revenueTarget > 0)
      .map(bc => [
        bc.displayName,
        bc.revenueTarget,
        bc.revenueActual,
        bc.revenuePercent,
        bc.revenueVariance,
        bc.cogsTarget,
        bc.cogsActual,
        bc.cogsPercent,
        bc.profitTarget,
        bc.profitActual,
        bc.profitPercent,
      ]);
    const budgetSheet = XLSX.utils.aoa_to_sheet([budgetHeaders, ...budgetRows]);
    XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budget vs Actual');
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

// Department Breakdown Export Types
interface DepartmentBreakdownData {
  budgetComparisons: BudgetComparison[];
  dateRange: { start: Date; end: Date };
  hotelName?: string;
  currencySymbol: string;
}

export function exportDepartmentBreakdownToPDF(data: DepartmentBreakdownData): void {
  const doc = new jsPDF();
  const { budgetComparisons, dateRange, hotelName, currencySymbol } = data;
  
  const formatCurrency = (value: number) => `${currencySymbol}${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Calculate totals
  const totalRevenue = budgetComparisons.reduce((sum, bc) => sum + bc.revenueActual, 0);
  const totalCogs = budgetComparisons.reduce((sum, bc) => sum + bc.cogsActual, 0);
  const totalProfit = budgetComparisons.reduce((sum, bc) => sum + bc.profitActual, 0);
  
  // Attractive Header with gradient effect
  doc.setFillColor(59, 130, 246); // Blue
  doc.rect(0, 0, pageWidth, 45, 'F');
  doc.setFillColor(99, 102, 241); // Slightly purple overlay
  doc.rect(0, 35, pageWidth, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Department Breakdown', 14, 22);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(hotelName || 'Hotel P/L Report', 14, 32);
  
  doc.setFontSize(10);
  doc.text(`${format(dateRange.start, 'MMMM dd, yyyy')} - ${format(dateRange.end, 'MMMM dd, yyyy')}`, 14, 42);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth - 14 - doc.getTextWidth(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`), 42);
  
  doc.setTextColor(0, 0, 0);
  
  // Summary Cards Section
  let yPos = 60;
  
  // Draw summary boxes
  const boxWidth = (pageWidth - 42) / 3;
  const boxHeight = 35;
  const boxes = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: COLORS.chart1 },
    { label: 'Total COGS', value: formatCurrency(totalCogs), color: COLORS.chart3 },
    { label: 'Total Profit', value: formatCurrency(totalProfit), color: COLORS.success },
  ];
  
  boxes.forEach((box, i) => {
    const xPos = 14 + i * (boxWidth + 7);
    
    // Box background
    doc.setFillColor(box.color[0], box.color[1], box.color[2]);
    doc.roundedRect(xPos, yPos, boxWidth, boxHeight, 3, 3, 'F');
    
    // Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(box.label, xPos + 8, yPos + 12);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(box.value, xPos + 8, yPos + 26);
  });
  
  yPos += boxHeight + 20;
  
  // Section Title
  doc.setTextColor(34, 34, 34);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Department Contribution Analysis', 14, yPos);
  
  yPos += 10;
  
  // Department Table
  const deptColors = [COLORS.chart1, COLORS.chart2, COLORS.chart3, COLORS.chart4, COLORS.chart5, COLORS.chart6, COLORS.chart7];
  
  const activeDepts = budgetComparisons.filter(bc => bc.revenueActual > 0 || bc.cogsActual > 0);
  
  const deptData = activeDepts.map((bc, i) => {
    const revenueContrib = totalRevenue > 0 ? (bc.revenueActual / totalRevenue) * 100 : 0;
    const cogsContrib = totalCogs > 0 ? (bc.cogsActual / totalCogs) * 100 : 0;
    const profitContrib = totalProfit > 0 ? (bc.profitActual / totalProfit) * 100 : 0;
    const expectedProfit = bc.revenueActual - bc.cogsActual;
    const profitValid = Math.abs(expectedProfit - bc.profitActual) < 1;
    
    return [
      { content: bc.displayName, styles: { textColor: deptColors[i % deptColors.length] as [number, number, number], fontStyle: 'bold' as const } },
      formatCurrency(bc.revenueActual),
      `${revenueContrib.toFixed(1)}%`,
      formatCurrency(bc.cogsActual),
      `${cogsContrib.toFixed(1)}%`,
      { content: formatCurrency(bc.profitActual), styles: { textColor: COLORS.success as [number, number, number] } },
      `${profitContrib.toFixed(1)}%`,
      { content: profitValid ? '✓' : '⚠', styles: { textColor: (profitValid ? COLORS.success : COLORS.warning) as [number, number, number], halign: 'center' as const } },
    ];
  });
  
  // Add totals row with proper typing
  const totalsRow = [
    { content: 'TOTAL', styles: { fontStyle: 'bold' as 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
    { content: formatCurrency(totalRevenue), styles: { fontStyle: 'bold' as 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
    { content: '100%', styles: { fontStyle: 'bold' as 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
    { content: formatCurrency(totalCogs), styles: { fontStyle: 'bold' as 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
    { content: '100%', styles: { fontStyle: 'bold' as 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
    { content: formatCurrency(totalProfit), styles: { fontStyle: 'bold' as 'bold', textColor: COLORS.success as [number, number, number], fillColor: [240, 240, 240] as [number, number, number] } },
    { content: '100%', styles: { fontStyle: 'bold' as 'bold', fillColor: [240, 240, 240] as [number, number, number] } },
    { content: '✓', styles: { fontStyle: 'bold' as 'bold', textColor: COLORS.success as [number, number, number], halign: 'center' as const, fillColor: [240, 240, 240] as [number, number, number] } },
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Department', 'Revenue', 'Rev %', 'COGS', 'COGS %', 'Profit', 'Profit %', 'Valid']],
    body: [...deptData, totalsRow],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] as [number, number, number], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 10, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', cellWidth: 25 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 15 },
    },
  });
  
  // Visual Bar Chart Section
  yPos = (doc as any).lastAutoTable.finalY + 20;
  
  if (yPos < 200) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 34, 34);
    doc.text('Revenue Contribution Chart', 14, yPos);
    
    yPos += 10;
    
    const barMaxWidth = pageWidth - 80;
    const barHeight = 12;
    const barGap = 18;
    
    activeDepts.forEach((bc, i) => {
      const revenueContrib = totalRevenue > 0 ? (bc.revenueActual / totalRevenue) * 100 : 0;
      const barWidth = (revenueContrib / 100) * barMaxWidth;
      const color = deptColors[i % deptColors.length];
      
      // Department name
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(bc.displayName, 14, yPos + 8);
      
      // Bar background
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(50, yPos, barMaxWidth, barHeight, 2, 2, 'F');
      
      // Bar fill
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(50, yPos, Math.max(barWidth, 2), barHeight, 2, 2, 'F');
      
      // Percentage
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text(`${revenueContrib.toFixed(1)}%`, 50 + barMaxWidth + 5, yPos + 8);
      
      yPos += barGap;
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, doc.internal.pageSize.getHeight() - 18, pageWidth - 14, doc.internal.pageSize.getHeight() - 18);
    
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    doc.text('Department Breakdown Report', 14, doc.internal.pageSize.getHeight() - 10);
    doc.text(format(new Date(), 'MMM dd, yyyy'), pageWidth - 14 - doc.getTextWidth(format(new Date(), 'MMM dd, yyyy')), doc.internal.pageSize.getHeight() - 10);
  }
  
  doc.save(`Department-Breakdown-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportDepartmentBreakdownToExcel(data: DepartmentBreakdownData): void {
  const { budgetComparisons, dateRange, hotelName, currencySymbol } = data;
  
  const workbook = XLSX.utils.book_new();
  
  // Calculate totals
  const totalRevenue = budgetComparisons.reduce((sum, bc) => sum + bc.revenueActual, 0);
  const totalCogs = budgetComparisons.reduce((sum, bc) => sum + bc.cogsActual, 0);
  const totalProfit = budgetComparisons.reduce((sum, bc) => sum + bc.profitActual, 0);
  
  const activeDepts = budgetComparisons.filter(bc => bc.revenueActual > 0 || bc.cogsActual > 0);
  
  // Summary Sheet
  const summaryData = [
    ['Department Breakdown Report'],
    [hotelName || 'Hotel P/L Report'],
    [`Period: ${format(dateRange.start, 'MMMM dd, yyyy')} - ${format(dateRange.end, 'MMMM dd, yyyy')}`],
    [`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`],
    [''],
    ['Summary'],
    ['Metric', 'Value'],
    ['Total Revenue', totalRevenue],
    ['Total COGS', totalCogs],
    ['Total Profit', totalProfit],
    ['Profit Margin %', totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0],
    ['Active Departments', activeDepts.length],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Detailed Breakdown Sheet
  const breakdownHeaders = [
    'Department',
    'Revenue',
    'Revenue %',
    'COGS',
    'COGS %',
    'Profit',
    'Profit %',
    'Margin %',
    'Validated',
  ];
  
  const breakdownRows = activeDepts.map(bc => {
    const revenueContrib = totalRevenue > 0 ? (bc.revenueActual / totalRevenue) * 100 : 0;
    const cogsContrib = totalCogs > 0 ? (bc.cogsActual / totalCogs) * 100 : 0;
    const profitContrib = totalProfit > 0 ? (bc.profitActual / totalProfit) * 100 : 0;
    const margin = bc.revenueActual > 0 ? ((bc.profitActual / bc.revenueActual) * 100) : 0;
    const expectedProfit = bc.revenueActual - bc.cogsActual;
    const profitValid = Math.abs(expectedProfit - bc.profitActual) < 1;
    
    return [
      bc.displayName,
      bc.revenueActual,
      revenueContrib.toFixed(1),
      bc.cogsActual,
      cogsContrib.toFixed(1),
      bc.profitActual,
      profitContrib.toFixed(1),
      margin.toFixed(1),
      profitValid ? 'Yes' : 'Check',
    ];
  });
  
  // Add totals row
  breakdownRows.push([
    'TOTAL',
    totalRevenue,
    '100.0',
    totalCogs,
    '100.0',
    totalProfit,
    '100.0',
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0',
    'Yes',
  ]);
  
  const breakdownSheet = XLSX.utils.aoa_to_sheet([breakdownHeaders, ...breakdownRows]);
  
  // Set column widths
  breakdownSheet['!cols'] = [
    { wch: 18 }, // Department
    { wch: 14 }, // Revenue
    { wch: 12 }, // Revenue %
    { wch: 14 }, // COGS
    { wch: 12 }, // COGS %
    { wch: 14 }, // Profit
    { wch: 12 }, // Profit %
    { wch: 12 }, // Margin %
    { wch: 10 }, // Validated
  ];
  
  XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Breakdown');
  
  // Budget Comparison Sheet
  if (budgetComparisons.some(bc => bc.revenueTarget > 0)) {
    const budgetHeaders = [
      'Department',
      'Revenue Target',
      'Revenue Actual',
      'Revenue Variance',
      'Revenue %',
      'COGS Target',
      'COGS Actual',
      'COGS Variance',
      'Profit Target',
      'Profit Actual',
      'Profit Variance',
      'Status',
    ];
    
    const budgetRows = budgetComparisons
      .filter(bc => bc.revenueTarget > 0)
      .map(bc => [
        bc.displayName,
        bc.revenueTarget,
        bc.revenueActual,
        bc.revenueVariance,
        bc.revenuePercent.toFixed(1),
        bc.cogsTarget,
        bc.cogsActual,
        bc.cogsVariance,
        bc.profitTarget,
        bc.profitActual,
        bc.profitActual - bc.profitTarget,
        bc.revenuePercent >= 90 ? 'On Track' : bc.revenuePercent >= 70 ? 'At Risk' : 'Behind',
      ]);
    
    const budgetSheet = XLSX.utils.aoa_to_sheet([budgetHeaders, ...budgetRows]);
    XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budget vs Actual');
  }
  
  XLSX.writeFile(workbook, `Department-Breakdown-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
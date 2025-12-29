import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { DepartmentPLData, HotelPLSummary, InventoryValuation, LowStockItem } from '@/hooks/useHotelPLData';
import { Forecast } from '@/utils/forecastingUtils';
import { Expense } from '@/hooks/useExpenseTracking';
import { BudgetComparison } from '@/hooks/useBudgetTargets';

// Professional color palette (RGB for jsPDF)
const COLORS = {
  primary: [41, 65, 114] as [number, number, number],      // Professional navy blue
  secondary: [55, 71, 79] as [number, number, number],     // Dark gray
  accent: [0, 150, 136] as [number, number, number],       // Teal
  success: [46, 125, 50] as [number, number, number],      // Green
  warning: [255, 152, 0] as [number, number, number],      // Orange
  danger: [211, 47, 47] as [number, number, number],       // Red
  lightGray: [245, 245, 245] as [number, number, number],  // Light background
  border: [224, 224, 224] as [number, number, number],     // Border gray
  text: [33, 33, 33] as [number, number, number],          // Dark text
  textMuted: [117, 117, 117] as [number, number, number],  // Muted text
};

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

// Safe percentage calculation to prevent NaN
const safePercent = (value: number, total: number): string => {
  if (!total || total === 0 || !isFinite(value) || !isFinite(total)) return '0.0%';
  const percent = (value / total) * 100;
  return isFinite(percent) ? `${percent.toFixed(1)}%` : '0.0%';
};

// Safe number formatting
const safeNumber = (value: number): string => {
  if (!isFinite(value) || isNaN(value)) return '0';
  return value.toFixed(1);
};

export function exportToPDF(data: ExportData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const { summary, departments, inventoryValuation, lowStockItems, forecast, expenseBreakdown, departmentExpenses, budgetComparisons, frontOffice, dateRange, hotelName, currencySymbol } = data;
  
  // Currency formatter - use simple string concatenation for reliability
  const formatCurrency = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) return `${currencySymbol} 0`;
    const formatted = Math.round(value).toLocaleString('en-IN');
    return `${currencySymbol} ${formatted}`;
  };
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // ============ PAGE 1: COVER & EXECUTIVE SUMMARY ============
  
  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(hotelName || 'Hotel Financial Report', margin, 22);
  
  // Report title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Profit & Loss Statement', margin, 32);
  
  // Report period badge
  doc.setFontSize(10);
  const periodText = `${format(dateRange.start, 'MMMM d, yyyy')} - ${format(dateRange.end, 'MMMM d, yyyy')}`;
  doc.text(periodText, margin, 40);
  
  // Generated date (right aligned)
  const generatedText = `Generated: ${format(new Date(), 'MMMM d, yyyy')}`;
  doc.text(generatedText, pageWidth - margin - doc.getTextWidth(generatedText), 40);
  
  // Reset text color
  doc.setTextColor(...COLORS.text);
  
  // ============ FINANCIAL SUMMARY SECTION ============
  let yPos = 60;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('FINANCIAL SUMMARY', margin, yPos);
  
  // Underline
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos + 2, margin + 50, yPos + 2);
  
  yPos += 12;
  doc.setTextColor(...COLORS.text);
  
  // Key financial metrics in a professional table format
  const financialData = [
    ['REVENUE', '', ''],
    ['Total Revenue', formatCurrency(summary.totalRevenue), '100.0%'],
    ['', '', ''],
    ['COST OF GOODS SOLD', '', ''],
    ['Total COGS', `(${formatCurrency(summary.totalCOGS)})`, safePercent(summary.totalCOGS, summary.totalRevenue)],
    ['', '', ''],
    ['GROSS PROFIT', formatCurrency(summary.grossProfit), safeNumber(summary.grossMargin) + '%'],
    ['', '', ''],
    ['TAXES', '', ''],
    ['Total Tax', `(${formatCurrency(summary.totalTax)})`, safePercent(summary.totalTax, summary.totalRevenue)],
    ['', '', ''],
    ['OPERATING PROFIT', formatCurrency(summary.operatingProfit || (summary.grossProfit - summary.totalTax)), safeNumber(summary.operatingMargin || ((summary.grossProfit - summary.totalTax) / summary.totalRevenue * 100)) + '%'],
  ];
  
  // Calculate total expenses
  const totalExpenses = expenseBreakdown?.reduce((sum, e) => sum + e.amount, 0) || 0;
  
  if (totalExpenses > 0) {
    financialData.push(
      ['', '', ''],
      ['OPERATING EXPENSES', '', ''],
      ['Total Operating Expenses', `(${formatCurrency(totalExpenses)})`, safePercent(totalExpenses, summary.totalRevenue)],
      ['', '', ''],
      ['NET PROFIT/(LOSS)', formatCurrency(summary.netProfit), safeNumber(summary.netMargin) + '%']
    );
  } else {
    financialData.push(
      ['', '', ''],
      ['NET PROFIT/(LOSS)', formatCurrency(summary.netProfit), safeNumber(summary.netMargin) + '%']
    );
  }
  
  autoTable(doc, {
    startY: yPos,
    body: financialData,
    theme: 'plain',
    styles: { 
      fontSize: 10, 
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      textColor: COLORS.text,
    },
    columnStyles: {
      0: { cellWidth: 90, fontStyle: 'normal' },
      1: { cellWidth: 50, halign: 'right' },
      2: { cellWidth: 30, halign: 'right', textColor: COLORS.textMuted },
    },
    didParseCell: (data) => {
      const cellText = String(data.cell.text[0] || '');
      // Make section headers bold
      if (cellText === 'REVENUE' || cellText === 'COST OF GOODS SOLD' || cellText === 'GROSS PROFIT' || 
          cellText === 'TAXES' || cellText === 'OPERATING PROFIT' || cellText === 'OPERATING EXPENSES' || 
          cellText.includes('NET PROFIT')) {
        data.cell.styles.fontStyle = 'bold';
        if (cellText.includes('NET PROFIT')) {
          data.cell.styles.textColor = summary.netProfit >= 0 ? COLORS.success : COLORS.danger;
        }
      }
      // Section headers
      if (['REVENUE', 'COST OF GOODS SOLD', 'TAXES', 'OPERATING EXPENSES'].includes(cellText)) {
        data.cell.styles.textColor = COLORS.primary;
        data.cell.styles.fontSize = 9;
      }
    },
  });
  
  // ============ KEY PERFORMANCE INDICATORS ============
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('KEY PERFORMANCE INDICATORS', margin, yPos);
  doc.setDrawColor(...COLORS.primary);
  doc.line(margin, yPos + 2, margin + 70, yPos + 2);
  
  yPos += 10;
  
  // KPI boxes
  const kpiData = [
    { label: 'Total Orders', value: summary.totalOrders.toString() },
    { label: 'Average Order Value', value: formatCurrency(summary.avgOrderValue) },
    { label: 'Gross Margin', value: safeNumber(summary.grossMargin) + '%' },
    { label: 'Net Margin', value: safeNumber(summary.netMargin) + '%' },
  ];
  
  const boxWidth = (contentWidth - 15) / 4;
  kpiData.forEach((kpi, index) => {
    const xPos = margin + (index * (boxWidth + 5));
    
    // Box background
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(xPos, yPos, boxWidth, 22, 2, 2, 'F');
    
    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(kpi.label, xPos + 5, yPos + 8);
    
    // Value
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(kpi.value, xPos + 5, yPos + 17);
  });
  
  // ============ PAGE 2: DEPARTMENT PERFORMANCE ============
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('DEPARTMENT PERFORMANCE', margin, yPos);
  doc.setDrawColor(...COLORS.primary);
  doc.line(margin, yPos + 2, margin + 65, yPos + 2);
  
  yPos += 10;
  
  const deptTableData = departments.map(d => [
    d.displayName,
    formatCurrency(d.revenue),
    formatCurrency(d.cogs),
    formatCurrency(d.tax),
    formatCurrency(d.grossProfit),
    formatCurrency(d.netProfit),
    safeNumber(d.margin) + '%',
    d.orderCount.toString(),
  ]);
  
  // Add totals row
  const totalRevenue = departments.reduce((sum, d) => sum + d.revenue, 0);
  const totalCOGS = departments.reduce((sum, d) => sum + d.cogs, 0);
  const totalTax = departments.reduce((sum, d) => sum + d.tax, 0);
  const totalGrossProfit = departments.reduce((sum, d) => sum + d.grossProfit, 0);
  const totalNetProfit = departments.reduce((sum, d) => sum + d.netProfit, 0);
  const totalOrders = departments.reduce((sum, d) => sum + d.orderCount, 0);
  const avgMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  
  deptTableData.push([
    'TOTAL',
    formatCurrency(totalRevenue),
    formatCurrency(totalCOGS),
    formatCurrency(totalTax),
    formatCurrency(totalGrossProfit),
    formatCurrency(totalNetProfit),
    safeNumber(avgMargin) + '%',
    totalOrders.toString(),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Department', 'Revenue', 'COGS', 'Tax', 'Gross Profit', 'Net Profit', 'Margin', 'Orders']],
    body: deptTableData,
    theme: 'striped',
    headStyles: { 
      fillColor: COLORS.primary, 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    styles: { cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    didParseCell: (data) => {
      // Style the totals row
      if (data.row.index === deptTableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 237, 255];
      }
    },
  });
  
  // ============ FRONT OFFICE SUMMARY (if available) ============
  if (frontOffice && frontOffice.revenue > 0) {
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('FRONT OFFICE SUMMARY', margin, yPos);
    doc.setDrawColor(...COLORS.primary);
    doc.line(margin, yPos + 2, margin + 55, yPos + 2);
    
    yPos += 10;
    
    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Check-ins', frontOffice.checkIns.toString()],
        ['Check-outs', frontOffice.checkOuts.toString()],
        ['Room Revenue', formatCurrency(frontOffice.revenue)],
      ],
      theme: 'striped',
      headStyles: { fillColor: COLORS.accent, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: COLORS.lightGray },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right' },
      },
    });
  }
  
  // ============ OPERATING EXPENSES ============
  if (expenseBreakdown && expenseBreakdown.length > 0) {
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('OPERATING EXPENSES', margin, yPos);
    doc.setDrawColor(...COLORS.primary);
    doc.line(margin, yPos + 2, margin + 55, yPos + 2);
    
    yPos += 10;
    
    const expenseTotal = expenseBreakdown.reduce((sum, e) => sum + e.amount, 0);
    
    // Category labels mapping
    const categoryLabels: Record<string, string> = {
      utilities: 'Utilities',
      salaries: 'Salaries & Wages',
      maintenance: 'Maintenance & Repairs',
      marketing: 'Marketing & Advertising',
      insurance: 'Insurance',
      rent: 'Rent & Lease',
      other: 'Other Expenses',
    };
    
    const expenseData = expenseBreakdown.map(e => [
      categoryLabels[e.category] || e.category.charAt(0).toUpperCase() + e.category.slice(1),
      formatCurrency(e.amount),
      safePercent(e.amount, expenseTotal),
    ]);
    
    expenseData.push([
      'TOTAL OPERATING EXPENSES',
      formatCurrency(expenseTotal),
      '100.0%',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Expense Category', 'Amount', '% of Total']],
      body: expenseData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.danger, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 40, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.row.index === expenseData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [255, 235, 235];
        }
      },
    });
  }
  
  // ============ BUDGET VS ACTUAL ============
  if (budgetComparisons && budgetComparisons.some(bc => bc.revenueTarget > 0)) {
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('BUDGET VS ACTUAL PERFORMANCE', margin, yPos);
    doc.setDrawColor(...COLORS.primary);
    doc.line(margin, yPos + 2, margin + 75, yPos + 2);
    
    yPos += 10;
    
    const budgetData = budgetComparisons
      .filter(bc => bc.revenueTarget > 0)
      .map(bc => [
        bc.displayName,
        formatCurrency(bc.revenueTarget),
        formatCurrency(bc.revenueActual),
        safeNumber(bc.revenuePercent) + '%',
        formatCurrency(bc.profitTarget),
        formatCurrency(bc.profitActual),
        safeNumber(bc.profitPercent) + '%',
      ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Department', 'Rev Budget', 'Rev Actual', 'Rev %', 'Profit Budget', 'Profit Actual', 'Profit %']],
      body: budgetData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.secondary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: COLORS.lightGray },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
      didParseCell: (data) => {
        // Color code percentage columns
        if (data.column.index === 3 || data.column.index === 6) {
          const value = parseFloat(String(data.cell.text[0]).replace('%', ''));
          if (!isNaN(value)) {
            if (value >= 100) {
              data.cell.styles.textColor = COLORS.success;
            } else if (value >= 80) {
              data.cell.styles.textColor = COLORS.warning;
            } else {
              data.cell.styles.textColor = COLORS.danger;
            }
          }
        }
      },
    });
  }
  
  // ============ INVENTORY VALUATION ============
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('INVENTORY VALUATION', margin, yPos);
  doc.setDrawColor(...COLORS.primary);
  doc.line(margin, yPos + 2, margin + 55, yPos + 2);
  
  yPos += 10;
  
  const invData = inventoryValuation.map(iv => [
    iv.displayName,
    formatCurrency(iv.totalValue),
    iv.itemCount.toString(),
    iv.lowStockCount.toString(),
  ]);
  
  // Add totals
  const totalInvValue = inventoryValuation.reduce((sum, iv) => sum + iv.totalValue, 0);
  const totalItems = inventoryValuation.reduce((sum, iv) => sum + iv.itemCount, 0);
  const totalLowStock = inventoryValuation.reduce((sum, iv) => sum + iv.lowStockCount, 0);
  
  invData.push(['TOTAL', formatCurrency(totalInvValue), totalItems.toString(), totalLowStock.toString()]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Department', 'Total Value', 'Item Count', 'Low Stock Items']],
    body: invData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.accent, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === invData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 245, 245];
      }
      // Highlight low stock
      if (data.column.index === 3 && data.row.index < invData.length - 1) {
        const value = parseInt(String(data.cell.text[0]));
        if (value > 0) {
          data.cell.styles.textColor = COLORS.danger;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });
  
  // ============ REVENUE FORECAST ============
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('REVENUE FORECAST', margin, yPos);
  doc.setDrawColor(...COLORS.primary);
  doc.line(margin, yPos + 2, margin + 50, yPos + 2);
  
  yPos += 10;
  
  const trendLabel = forecast.trendDirection.charAt(0).toUpperCase() + forecast.trendDirection.slice(1);
  const confidenceLabel = forecast.confidence.charAt(0).toUpperCase() + forecast.confidence.slice(1);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Forecast Metric', 'Projected Value']],
    body: [
      ['Projected Revenue', formatCurrency(forecast.projectedRevenue)],
      ['Projected COGS', formatCurrency(forecast.projectedCOGS)],
      ['Projected Gross Profit', formatCurrency(forecast.projectedProfit)],
      ['Expected Growth Rate', safeNumber(forecast.growthRate) + '%'],
      ['Trend Direction', trendLabel],
      ['Confidence Level', confidenceLabel],
    ],
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 90, fontStyle: 'bold' },
      1: { cellWidth: 70, halign: 'right' },
    },
  });
  
  // ============ LOW STOCK ALERTS ============
  if (lowStockItems.length > 0) {
    doc.addPage();
    yPos = 20;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.danger);
    doc.text('LOW STOCK ALERTS', margin, yPos);
    doc.setDrawColor(...COLORS.danger);
    doc.line(margin, yPos + 2, margin + 45, yPos + 2);
    
    yPos += 10;
    
    const lowStockData = lowStockItems.slice(0, 25).map(item => [
      item.name,
      item.department,
      `${item.currentStock} ${item.unit}`,
      `${item.minStockLevel} ${item.unit}`,
      safeNumber(item.percentBelowMin) + '% below minimum',
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Item Name', 'Department', 'Current Stock', 'Minimum Required', 'Status']],
      body: lowStockData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.warning, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        4: { textColor: COLORS.danger },
      },
    });
  }
  
  // ============ FOOTER ON ALL PAGES ============
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    
    // Left: Company name
    doc.text(hotelName || 'Financial Report', margin, pageHeight - 10);
    
    // Center: Page number
    const pageText = `Page ${i} of ${pageCount}`;
    doc.text(pageText, (pageWidth - doc.getTextWidth(pageText)) / 2, pageHeight - 10);
    
    // Right: Date
    const dateText = format(new Date(), 'MMMM d, yyyy');
    doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), pageHeight - 10);
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
    ['FINANCIAL SUMMARY'],
    ['Metric', 'Value', '% of Revenue'],
    ['Total Revenue', summary.totalRevenue, '100.0%'],
    ['Total COGS', summary.totalCOGS, summary.totalRevenue > 0 ? `${((summary.totalCOGS / summary.totalRevenue) * 100).toFixed(1)}%` : '0.0%'],
    ['Gross Profit', summary.grossProfit, `${summary.grossMargin.toFixed(1)}%`],
    ['Total Tax', summary.totalTax, summary.totalRevenue > 0 ? `${((summary.totalTax / summary.totalRevenue) * 100).toFixed(1)}%` : '0.0%'],
    ['Operating Profit', summary.operatingProfit || (summary.grossProfit - summary.totalTax), `${(summary.operatingMargin || ((summary.grossProfit - summary.totalTax) / summary.totalRevenue * 100)).toFixed(1)}%`],
    ['Net Profit', summary.netProfit, `${summary.netMargin.toFixed(1)}%`],
    [''],
    ['KEY METRICS'],
    ['Total Orders', summary.totalOrders],
    ['Average Order Value', summary.avgOrderValue],
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
      expTotal > 0 ? ((e.amount / expTotal) * 100).toFixed(1) : '0.0',
    ]);
    breakdownRows.push(['Total', expTotal, '100.0']);
    const expBreakdownSheet = XLSX.utils.aoa_to_sheet([breakdownHeaders, ...breakdownRows]);
    XLSX.utils.book_append_sheet(workbook, expBreakdownSheet, 'Expense Breakdown');
  }
  
  // Budget vs Actual Sheet
  if (budgetComparisons && budgetComparisons.length > 0) {
    const budgetHeaders = ['Department', 'Revenue Target', 'Revenue Actual', 'Revenue %', 'Revenue Variance', 'Profit Target', 'Profit Actual', 'Profit %', 'Profit Variance'];
    const budgetRows = budgetComparisons.map(bc => [
      bc.displayName,
      bc.revenueTarget,
      bc.revenueActual,
      bc.revenuePercent.toFixed(1),
      bc.revenueVariance,
      bc.profitTarget,
      bc.profitActual,
      bc.profitPercent.toFixed(1),
      bc.profitVariance,
    ]);
    const budgetSheet = XLSX.utils.aoa_to_sheet([budgetHeaders, ...budgetRows]);
    XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budget vs Actual');
  }
  
  // Inventory Sheet
  const invHeaders = ['Department', 'Total Value', 'Item Count', 'Low Stock Items'];
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
    const lowStockHeaders = ['Item', 'Department', 'Current Stock', 'Unit', 'Min Level', '% Below Min'];
    const lowStockRows = lowStockItems.map(item => [
      item.name,
      item.department,
      item.currentStock,
      item.unit,
      item.minStockLevel,
      item.percentBelowMin.toFixed(1),
    ]);
    const lowStockSheet = XLSX.utils.aoa_to_sheet([lowStockHeaders, ...lowStockRows]);
    XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Low Stock Alerts');
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
  ]);
  XLSX.utils.book_append_sheet(workbook, forecastSheet, 'Forecast');
  
  // Save workbook
  XLSX.writeFile(workbook, `PL-Report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// Department Breakdown Export Functions
export function exportDepartmentBreakdownToPDF(
  departments: DepartmentPLData[],
  dateRange: { start: Date; end: Date },
  hotelName: string,
  currencySymbol: string
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const formatCurrency = (value: number): string => {
    if (!isFinite(value) || isNaN(value)) return `${currencySymbol} 0`;
    const formatted = Math.round(value).toLocaleString('en-IN');
    return `${currencySymbol} ${formatted}`;
  };
  
  const safePercentage = (value: number, total: number): string => {
    if (!total || total === 0) return '0.0%';
    const percent = (value / total) * 100;
    return isFinite(percent) ? `${percent.toFixed(1)}%` : '0.0%';
  };
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  
  // Calculate totals
  const totalRevenue = departments.reduce((sum, d) => sum + d.revenue, 0);
  const totalCOGS = departments.reduce((sum, d) => sum + d.cogs, 0);
  const totalGrossProfit = departments.reduce((sum, d) => sum + d.grossProfit, 0);
  const totalNetProfit = departments.reduce((sum, d) => sum + d.netProfit, 0);
  const totalOrders = departments.reduce((sum, d) => sum + d.orderCount, 0);
  
  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(hotelName || 'Department Analysis', margin, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Department Performance Breakdown', margin, 30);
  
  const periodText = `${format(dateRange.start, 'MMMM d, yyyy')} - ${format(dateRange.end, 'MMMM d, yyyy')}`;
  doc.text(periodText, pageWidth - margin - doc.getTextWidth(periodText), 30);
  
  doc.setTextColor(...COLORS.text);
  
  // Summary cards
  let yPos = 55;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('SUMMARY OVERVIEW', margin, yPos);
  doc.setDrawColor(...COLORS.primary);
  doc.line(margin, yPos + 2, margin + 50, yPos + 2);
  
  yPos += 12;
  
  const summaryMetrics = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
    { label: 'Total COGS', value: formatCurrency(totalCOGS) },
    { label: 'Gross Profit', value: formatCurrency(totalGrossProfit) },
    { label: 'Net Profit', value: formatCurrency(totalNetProfit) },
  ];
  
  const boxWidth = (pageWidth - (margin * 2) - 15) / 4;
  summaryMetrics.forEach((metric, index) => {
    const xPos = margin + (index * (boxWidth + 5));
    
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(xPos, yPos, boxWidth, 22, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(metric.label, xPos + 4, yPos + 8);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.text);
    doc.text(metric.value, xPos + 4, yPos + 17);
  });
  
  // Department contribution table
  yPos += 35;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('REVENUE CONTRIBUTION BY DEPARTMENT', margin, yPos);
  doc.setDrawColor(...COLORS.primary);
  doc.line(margin, yPos + 2, margin + 85, yPos + 2);
  
  yPos += 10;
  
  const contributionData = departments
    .sort((a, b) => b.revenue - a.revenue)
    .map(d => [
      d.displayName,
      formatCurrency(d.revenue),
      safePercentage(d.revenue, totalRevenue),
      formatCurrency(d.grossProfit),
      safePercentage(d.grossProfit, totalGrossProfit),
      d.orderCount.toString(),
    ]);
  
  contributionData.push([
    'TOTAL',
    formatCurrency(totalRevenue),
    '100.0%',
    formatCurrency(totalGrossProfit),
    '100.0%',
    totalOrders.toString(),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Department', 'Revenue', 'Rev %', 'Gross Profit', 'Profit %', 'Orders']],
    body: contributionData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === contributionData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 237, 255];
      }
    },
  });
  
  // Detailed performance table
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('DETAILED PERFORMANCE METRICS', margin, yPos);
  doc.setDrawColor(...COLORS.primary);
  doc.line(margin, yPos + 2, margin + 75, yPos + 2);
  
  yPos += 10;
  
  const detailedData = departments.map(d => [
    d.displayName,
    formatCurrency(d.revenue),
    formatCurrency(d.cogs),
    formatCurrency(d.tax),
    formatCurrency(d.netProfit),
    `${d.margin.toFixed(1)}%`,
    formatCurrency(d.avgOrderValue),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Department', 'Revenue', 'COGS', 'Tax', 'Net Profit', 'Margin', 'Avg Order']],
    body: detailedData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.accent, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    
    doc.text(hotelName || 'Department Report', margin, pageHeight - 10);
    
    const pageText = `Page ${i} of ${pageCount}`;
    doc.text(pageText, (pageWidth - doc.getTextWidth(pageText)) / 2, pageHeight - 10);
    
    const dateText = format(new Date(), 'MMMM d, yyyy');
    doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), pageHeight - 10);
  }
  
  doc.save(`Department-Breakdown-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function exportDepartmentBreakdownToExcel(
  departments: DepartmentPLData[],
  dateRange: { start: Date; end: Date },
  hotelName: string,
  currencySymbol: string
): void {
  const workbook = XLSX.utils.book_new();
  
  // Calculate totals
  const totalRevenue = departments.reduce((sum, d) => sum + d.revenue, 0);
  const totalCOGS = departments.reduce((sum, d) => sum + d.cogs, 0);
  const totalTax = departments.reduce((sum, d) => sum + d.tax, 0);
  const totalGrossProfit = departments.reduce((sum, d) => sum + d.grossProfit, 0);
  const totalNetProfit = departments.reduce((sum, d) => sum + d.netProfit, 0);
  const totalOrders = departments.reduce((sum, d) => sum + d.orderCount, 0);
  
  // Summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet([
    [hotelName || 'Department Breakdown'],
    [`Period: ${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`],
    [''],
    ['SUMMARY'],
    ['Metric', 'Value'],
    ['Total Revenue', totalRevenue],
    ['Total COGS', totalCOGS],
    ['Total Tax', totalTax],
    ['Total Gross Profit', totalGrossProfit],
    ['Total Net Profit', totalNetProfit],
    ['Total Orders', totalOrders],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Contribution sheet
  const contribHeaders = ['Department', 'Revenue', 'Revenue %', 'Gross Profit', 'Profit %', 'Orders', 'Order %'];
  const contribRows = departments.sort((a, b) => b.revenue - a.revenue).map(d => [
    d.displayName,
    d.revenue,
    totalRevenue > 0 ? ((d.revenue / totalRevenue) * 100).toFixed(1) : '0.0',
    d.grossProfit,
    totalGrossProfit > 0 ? ((d.grossProfit / totalGrossProfit) * 100).toFixed(1) : '0.0',
    d.orderCount,
    totalOrders > 0 ? ((d.orderCount / totalOrders) * 100).toFixed(1) : '0.0',
  ]);
  const contribSheet = XLSX.utils.aoa_to_sheet([contribHeaders, ...contribRows]);
  XLSX.utils.book_append_sheet(workbook, contribSheet, 'Contribution');
  
  // Detailed sheet
  const detailHeaders = ['Department', 'Revenue', 'COGS', 'Tax', 'Gross Profit', 'Net Profit', 'Margin %', 'Orders', 'Avg Order', 'Trend %'];
  const detailRows = departments.map(d => [
    d.displayName,
    d.revenue,
    d.cogs,
    d.tax,
    d.grossProfit,
    d.netProfit,
    d.margin.toFixed(1),
    d.orderCount,
    d.avgOrderValue,
    d.trend.toFixed(1),
  ]);
  const detailSheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detailed Performance');
  
  XLSX.writeFile(workbook, `Department-Breakdown-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Transaction } from '../types';

// Define interfaces for data structures passed from the dashboard
interface Kpis {
    totalRevenue: number;
    totalExpenses: number;
    totalSavings: number;
    netBalance: number;
    savingsRate: number;
}
interface ExpenseSummaryData {
    category: string;
    actualAmount: number;
    proratedBudget: number;
    difference: number;
}
interface ChartImages {
    monthly: string;
    savings: string;
    expenses: string;
    revenues: string;
}

const formatCurrency = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' });

// Define Excel number formats
const currencyFormat = '#,##0.00 "MAD";[Red]-#,##0.00 "MAD"';
const percentFormat = '0.00%';

// Helper to apply number formats to specific columns in a worksheet
const applyColumnFormats = (ws: XLSX.WorkSheet, formatConfig: { [col: string]: string }) => {
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = 1; R <= range.e.r; ++R) { // Start from row 2 (index 1)
        for (const colLetter in formatConfig) {
            const colIndex = XLSX.utils.decode_col(colLetter);
            const address = XLSX.utils.encode_cell({ r: R, c: colIndex });
            if (ws[address] && typeof ws[address].v === 'number') {
                ws[address].z = formatConfig[colLetter];
            }
        }
    }
};

/**
 * Exports only the budget analysis data to a single-sheet Excel file with formatting.
 */
export const exportBudgetAnalysisToExcel = (data: ExpenseSummaryData[], fileName: string): void => {
    const worksheetData = data.map(item => ({
        'Catégorie': item.category,
        'Dépenses Réelles': item.actualAmount,
        'Budget (Période)': item.proratedBudget,
        'Écart': item.difference,
    }));

    const totals = data.reduce((acc, item) => {
        acc.actualAmount += item.actualAmount;
        acc.proratedBudget += item.proratedBudget;
        acc.difference += item.difference;
        return acc;
    }, { actualAmount: 0, proratedBudget: 0, difference: 0 });

    worksheetData.push({
        'Catégorie': 'Total',
        'Dépenses Réelles': totals.actualAmount,
        'Budget (Période)': totals.proratedBudget,
        'Écart': totals.difference
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    
    applyColumnFormats(worksheet, {
        'B': currencyFormat,
        'C': currencyFormat,
        'D': currencyFormat
    });
    worksheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];


    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analyse Budgétaire');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Exports a comprehensive, formatted, multi-sheet financial report to Excel.
 */
export const exportToExcel = (transactions: Transaction[], kpis: Kpis, budgetData: ExpenseSummaryData[], fileName: string): void => {
    const wb = XLSX.utils.book_new();

    const budgetTotals = budgetData.reduce((acc, item) => ({
        actualAmount: acc.actualAmount + item.actualAmount,
        proratedBudget: acc.proratedBudget + item.proratedBudget,
        difference: acc.difference + item.difference
    }), { actualAmount: 0, proratedBudget: 0, difference: 0 });


    // 1. Summary Sheet (acting as a dashboard)
    const summaryData = [
        ["Rapport Financier - Résumé"],
        [], // empty row
        ["Indicateurs Clés de Performance (KPIs)"],
        ["Total Revenus", kpis.totalRevenue],
        ["Total Dépenses", kpis.totalExpenses],
        ["Total Épargne", kpis.totalSavings],
        ["Solde Net", kpis.netBalance],
        ["Taux d'Épargne", kpis.savingsRate / 100],
        [],
        ["Totaux de l'Analyse Budgétaire"],
        ["Dépenses Réelles (Total)", budgetTotals.actualAmount],
        ["Budget Période (Total)", budgetTotals.proratedBudget],
        ["Écart (Total)", budgetTotals.difference]
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['B4'].z = currencyFormat;
    summaryWs['B5'].z = currencyFormat;
    summaryWs['B6'].z = currencyFormat;
    summaryWs['B7'].z = currencyFormat;
    summaryWs['B8'].z = percentFormat;
    summaryWs['B11'].z = currencyFormat;
    summaryWs['B12'].z = currencyFormat;
    summaryWs['B13'].z = currencyFormat;
    summaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé et Totaux');
    

    // 2. Budget Analysis Sheet
    const budgetSheetData = budgetData.map(item => ({
        'Catégorie': item.category,
        'Dépenses Réelles': item.actualAmount,
        'Budget (Période)': item.proratedBudget,
        'Écart': item.difference,
    }));
    budgetSheetData.push({
        'Catégorie': 'Total',
        'Dépenses Réelles': budgetTotals.actualAmount,
        'Budget (Période)': budgetTotals.proratedBudget,
        'Écart': budgetTotals.difference
    });
    const budgetWs = XLSX.utils.json_to_sheet(budgetSheetData);
    applyColumnFormats(budgetWs, { 'B': currencyFormat, 'C': currencyFormat, 'D': currencyFormat });
    budgetWs['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, budgetWs, 'Analyse Budgétaire');

    // 3. Transactions Sheet
    const txWorksheetData = transactions.map(t => ({
        Date: t.date,
        Description: t.description,
        Montant: t.type === 'Revenu' ? t.amount : -t.amount,
        Type: t.type === 'Sorties' ? 'Epargne/Invest.' : t.type,
        Compte: t.account
    }));
    const txWs = XLSX.utils.json_to_sheet(txWorksheetData, { cellDates: true });
    applyColumnFormats(txWs, { 'C': currencyFormat });
    txWs['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, txWs, 'Transactions');

    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

/**
 * Exports a comprehensive multi-section financial report to PDF with charts.
 */
export const exportToPdf = (
    transactions: Transaction[], 
    kpis: Kpis, 
    budgetData: ExpenseSummaryData[], 
    chartImages: ChartImages, 
    title: string
): void => {
    const doc = new jsPDF();
    let startY = 20;

    // Page 1: Title and KPIs
    doc.setFontSize(18);
    doc.text(title, 14, startY);
    startY += 15;

    doc.setFontSize(14);
    doc.text("Résumé Financier", 14, startY);
    startY += 8;
    autoTable(doc, {
        body: [
            ['Total Revenus', formatCurrency(kpis.totalRevenue)],
            ['Total Dépenses', formatCurrency(kpis.totalExpenses)],
            ['Total Épargne', formatCurrency(kpis.totalSavings)],
            ['Solde Net', formatCurrency(kpis.netBalance)],
            ["Taux d'Épargne", `${kpis.savingsRate.toFixed(2)} %`],
        ],
        startY,
        theme: 'grid',
        headStyles: { fillColor: [75, 85, 99] },
    });
    
    // Page 2: Charts
    doc.addPage();
    startY = 20;
    doc.setFontSize(16);
    doc.text("Visualisations Graphiques", 14, startY);
    startY += 10;
    
    const addImageToPdf = (imgData: string, x: number, y: number, width: number, height: number) => {
        if (imgData) {
            try {
                doc.addImage(imgData, 'PNG', x, y, width, height);
            } catch (e) {
                console.error("Failed to add image to PDF", e);
                doc.text("Erreur graphique", x, y + height / 2);
            }
        } else {
             doc.text("Graphique non disponible", x, y + height / 2);
        }
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageMargin = 14;
    const chartWidth = (pageWidth - pageMargin * 3) / 2;
    const chartHeight = chartWidth * 0.6; // Maintain aspect ratio
    
    addImageToPdf(chartImages.monthly, pageMargin, startY, chartWidth, chartHeight);
    addImageToPdf(chartImages.savings, pageMargin + chartWidth + pageMargin, startY, chartWidth, chartHeight);
    startY += chartHeight + 10;

    addImageToPdf(chartImages.expenses, pageMargin, startY, chartWidth, chartHeight);
    addImageToPdf(chartImages.revenues, pageMargin + chartWidth + pageMargin, startY, chartWidth, chartHeight);

    // Page 3+: Data tables
    doc.addPage();
    startY = 20;

    // Budget Analysis Section
    doc.setFontSize(14);
    doc.text("Analyse Budgétaire des Dépenses", 14, startY);
    startY += 8;
    const budgetHead = [['Catégorie', 'Dépenses', 'Budget Période', 'Écart']];
    const budgetBody = budgetData.map(item => [
        item.category,
        formatCurrency(item.actualAmount),
        formatCurrency(item.proratedBudget),
        formatCurrency(item.difference),
    ]);
     const budgetTotals = budgetData.reduce((acc, item) => ({
        actualAmount: acc.actualAmount + item.actualAmount,
        proratedBudget: acc.proratedBudget + item.proratedBudget,
        difference: acc.difference + item.difference
    }), { actualAmount: 0, proratedBudget: 0, difference: 0 });
    const budgetFoot = [['Total', formatCurrency(budgetTotals.actualAmount), formatCurrency(budgetTotals.proratedBudget), formatCurrency(budgetTotals.difference)]];

    autoTable(doc, {
        head: budgetHead,
        body: budgetBody,
        foot: budgetFoot,
        startY,
        headStyles: { fillColor: [75, 85, 99] },
        footStyles: { fillColor: [75, 85, 99], fontStyle: 'bold' },
        pageBreak: 'auto'
    });
    
    let finalY = (doc as any).lastAutoTable.finalY;
    
    // Check if there is space for the next table on the current page, otherwise add a new page
    if (finalY + 30 > doc.internal.pageSize.getHeight()) {
        doc.addPage();
        startY = 20;
    } else {
        startY = finalY + 15;
    }

    // Transactions Section
    doc.setFontSize(14);
    doc.text("Historique des Transactions", 14, startY);
    startY += 8;
    const txHead = [["Date", "Description", "Montant", "Type", "Compte"]];
    const txBody = transactions.map(t => {
        const amount = t.type === 'Revenu' ? t.amount : -t.amount;
        return [
            t.date.toLocaleDateString('fr-CA'),
            t.description,
            formatCurrency(amount),
            t.type === 'Sorties' ? 'Epargne/Invest.' : t.type,
            t.account
        ];
    });

    autoTable(doc, {
        head: txHead,
        body: txBody,
        startY,
        headStyles: { fillColor: [75, 85, 99] },
        pageBreak: 'auto'
    });
    
    doc.save("rapport_financier.pdf");
};

import { ReportResult } from '../types';

/**
 * Report export service - PDF and Excel export
 * Note: For full PDF/Excel support, install:
 * - npm install pdfkit @types/pdfkit
 * - npm install exceljs
 */
export const exportReportToPDF = async (
  reportData: ReportResult,
  formatOptions?: { orientation?: 'portrait' | 'landscape'; pageSize?: number }
): Promise<Buffer> => {
  // Try to use pdfkit if available
  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: formatOptions?.orientation === 'landscape' ? 'A4-L' : 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    // Header
    doc.fontSize(20).text('Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date(reportData.metadata.generatedAt).toLocaleString()}`);
    doc.text(`Total Rows: ${reportData.metadata.totalRows}`);
    doc.moveDown();

    // Table headers
    const startY = doc.y;
    const rowHeight = 20;
    const colWidth = (doc.page.width - 100) / reportData.columns.length;
    
    doc.fontSize(10).font('Helvetica-Bold');
    reportData.columns.forEach((col, i) => {
      doc.text(col, 50 + i * colWidth, startY, { width: colWidth, align: 'left' });
    });
    
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);

    // Table rows
    doc.font('Helvetica');
    const pageSize = formatOptions?.pageSize || 50;
    reportData.rows.slice(0, pageSize).forEach((row, rowIndex) => {
      if (doc.y > doc.page.height - 50) {
        doc.addPage();
      }
      
      reportData.columns.forEach((col, colIndex) => {
        const value = row[col] !== null && row[col] !== undefined ? String(row[col]) : '-';
        doc.text(value.substring(0, 30), 50 + colIndex * colWidth, doc.y, { width: colWidth, align: 'left' });
      });
      doc.moveDown();
    });

    if (reportData.rows.length > pageSize) {
      doc.moveDown();
      doc.fontSize(10).text(`... and ${reportData.rows.length - pageSize} more rows`, { align: 'center' });
    }

    // Summary if available
    if (reportData.summary) {
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold').text('Summary', { align: 'center' });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10);
      Object.entries(reportData.summary.totals || {}).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, { align: 'left' });
      });
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });
  } catch (error) {
    // Fallback to simple text-based PDF structure
    const lines: string[] = [];
    lines.push('Report');
    lines.push('');
    lines.push(`Generated: ${new Date(reportData.metadata.generatedAt).toLocaleString()}`);
    lines.push(`Total Rows: ${reportData.metadata.totalRows}`);
    lines.push('');
    lines.push(reportData.columns.join(' | '));
    lines.push('-'.repeat(reportData.columns.join(' | ').length));
    
    const pageSize = formatOptions?.pageSize || 100;
    reportData.rows.slice(0, pageSize).forEach(row => {
      const values = reportData.columns.map(col => {
        const value = row[col] !== null && row[col] !== undefined ? String(row[col]) : '-';
        return value.substring(0, 30);
      });
      lines.push(values.join(' | '));
    });

    if (reportData.rows.length > pageSize) {
      lines.push('');
      lines.push(`... and ${reportData.rows.length - pageSize} more rows`);
    }

    return Buffer.from(lines.join('\n'));
  }
};

export const exportReportToExcel = async (
  reportData: ReportResult
): Promise<Buffer> => {
  // Try to use exceljs if available
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    worksheet.addRow(reportData.columns);
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    reportData.rows.forEach(row => {
      const values = reportData.columns.map(col => row[col] ?? '');
      worksheet.addRow(values);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      if (column.header) {
        column.width = Math.max(column.header.length, 15);
      }
    });

    // Add summary if available
    if (reportData.summary) {
      worksheet.addRow([]);
      worksheet.addRow(['Summary']);
      const summaryRow = worksheet.getRow(worksheet.rowCount);
      summaryRow.font = { bold: true };
      
      Object.entries(reportData.summary.totals || {}).forEach(([key, value]) => {
        worksheet.addRow([key, value]);
      });
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    // Fallback to tab-delimited format
    const lines: string[] = [];
    lines.push(reportData.columns.join('\t'));
    
    reportData.rows.forEach(row => {
      const values = reportData.columns.map(col => {
        const value = row[col] !== null && row[col] !== undefined ? String(row[col]) : '';
        return value.replace(/\t/g, ' ').replace(/\n/g, ' ');
      });
      lines.push(values.join('\t'));
    });
    
    return Buffer.from(lines.join('\n'));
  }
};

export const exportReportToCSV = (reportData: ReportResult): string => {
  const rows = [
    reportData.columns.join(','),
    ...reportData.rows.map(row =>
      reportData.columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const str = String(value);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ];
  return rows.join('\n');
};

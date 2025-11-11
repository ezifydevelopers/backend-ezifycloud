import { ReportResult } from '../types';
import * as ExportService from './exportService';

/**
 * Email service for report delivery - functional approach
 */
let transporter: any | null = null;

const getTransporter = () => {
  // Check if nodemailer is available (optional dependency)
  try {
    const nodemailer = require('nodemailer');
    
    if (transporter) return transporter;

    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      return null;
    }

    // Configure based on environment variables
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    return transporter;
  } catch (error) {
    // nodemailer not installed - email features disabled
    return null;
  }
};

export const sendReportEmail = async (
  recipients: string[],
  reportName: string,
  reportData: ReportResult,
  format: 'pdf' | 'excel' | 'csv'
): Promise<void> => {
  try {
    const emailTransporter = getTransporter();

    if (!emailTransporter) {
      throw new Error('Email not configured. Set SMTP environment variables.');
    }

    let attachment: { filename: string; content: Buffer | string } | null = null;

    if (format === 'pdf') {
      const pdfBuffer = await ExportService.exportReportToPDF(reportData);
      attachment = {
        filename: `${reportName}.pdf`,
        content: pdfBuffer,
      };
    } else if (format === 'excel') {
      const excelBuffer = await ExportService.exportReportToExcel(reportData);
      attachment = {
        filename: `${reportName}.xlsx`,
        content: excelBuffer,
      };
    } else {
      // CSV as plain text
      const csv = ExportService.exportReportToCSV(reportData);
      attachment = {
        filename: `${reportName}.csv`,
        content: csv,
      };
    }

    // Check if email is configured
    if (!emailTransporter) {
      console.warn('Email not configured. Skipping email delivery.');
      return;
    }

    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients.join(', '),
      subject: `Report: ${reportName}`,
      text: `Please find attached the ${reportName} report.\n\nGenerated at: ${reportData.metadata.generatedAt}\nTotal Rows: ${reportData.metadata.totalRows}`,
      html: `
        <h2>${reportName}</h2>
        <p>Please find attached the report.</p>
        <p><strong>Generated at:</strong> ${new Date(reportData.metadata.generatedAt).toLocaleString()}</p>
        <p><strong>Total Rows:</strong> ${reportData.metadata.totalRows}</p>
      `,
      attachments: attachment ? [attachment] : [],
    });
  } catch (error) {
    console.error('Error sending report email:', error);
    throw error;
  }
};



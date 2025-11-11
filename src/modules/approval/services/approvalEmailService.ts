// Approval email service - Sends email notifications for approval actions

import { NotificationType } from '@prisma/client';
import { NotificationService } from '../../notification/services/notificationService';

let emailTransporter: any | null = null;

const getEmailTransporter = () => {
  // Check if nodemailer is available (optional dependency)
  try {
    const nodemailer = require('nodemailer');
    
    if (emailTransporter) return emailTransporter;

    // Check if SMTP is configured
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;
    
    if (!smtpUser || !smtpPass) {
      return null;
    }

    // Configure based on environment variables
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    return emailTransporter;
  } catch (error) {
    // nodemailer not installed - email features disabled
    return null;
  }
};

export interface ApprovalEmailData {
  recipientEmail: string;
  recipientName: string;
  itemName: string;
  itemId: string;
  workspaceId: string;
  boardId: string;
  approvalLevel?: string;
  approverName?: string;
  comments?: string;
  feedback?: string;
  rejectionReason?: string;
  deadline?: Date;
  link?: string;
}

export class ApprovalEmailService {
  /**
   * Send email notification and create database notification
   */
  static async sendApprovalNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    emailData: ApprovalEmailData,
    link?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Create database notification first
      const notification = await NotificationService.createNotification({
        userId,
        type,
        title,
        message,
        link: link || emailData.link,
        metadata: {
          ...metadata,
          itemId: emailData.itemId,
          itemName: emailData.itemName,
        },
      });

      // Try to send email
      const transporter = getEmailTransporter();
      if (transporter) {
        try {
          const emailSubject = this.getEmailSubject(type, emailData);
          const emailLink = link || emailData.link || '#';
          const emailHtml = this.getEmailHtml(type, emailData, message, emailLink);

          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER,
            to: emailData.recipientEmail,
            subject: emailSubject,
            html: emailHtml,
            text: message,
          });

          // Mark email as sent
          await NotificationService.markEmailSent(notification.id);
        } catch (emailError) {
          console.error('Error sending approval email:', emailError);
          // Don't fail the whole operation if email fails
        }
      } else {
        console.warn('Email not configured. Notification created but email not sent.');
      }
    } catch (error) {
      console.error('Error creating approval notification:', error);
      // Don't throw - notification failure shouldn't break approval process
    }
  }

  /**
   * Get email subject based on notification type
   */
  private static getEmailSubject(type: NotificationType, data: ApprovalEmailData): string {
    switch (type) {
      case 'approval_requested':
        return `Approval Required: ${data.itemName}`;
      case 'approval_approved':
        return `Approval Approved: ${data.itemName}`;
      case 'approval_rejected':
        return `Approval Rejected: ${data.itemName}`;
      case 'changes_requested':
        return `Changes Requested: ${data.itemName}`;
      case 'approval_complete':
        return `All Approvals Complete: ${data.itemName}`;
      case 'approval_reminder':
        return `Reminder: Approval Required for ${data.itemName}`;
      case 'approval_deadline_approaching':
        return `Urgent: Approval Deadline Approaching for ${data.itemName}`;
      case 'approval_deadline_passed':
        return `Overdue: Approval Deadline Passed for ${data.itemName}`;
      default:
        return `Notification: ${data.itemName}`;
    }
  }

  /**
   * Get email HTML template based on notification type
   */
  private static getEmailHtml(
    type: NotificationType,
    data: ApprovalEmailData,
    message: string,
    link: string
  ): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const fullLink = link.startsWith('http') ? link : `${baseUrl}${link}`;
    const deadlineText = data.deadline 
      ? `<p><strong>Deadline:</strong> ${new Date(data.deadline).toLocaleString()}</p>`
      : '';

    const actionButton = type === 'approval_requested' || type === 'approval_reminder' || type === 'approval_deadline_approaching'
      ? `<a href="${fullLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">Review & Approve</a>`
      : `<a href="${fullLink}" style="display: inline-block; padding: 12px 24px; background-color: #6c757d; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">View Item</a>`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 4px 4px 0 0; }
          .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 4px 4px; }
          .item-name { font-size: 18px; font-weight: bold; margin: 10px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${this.getEmailSubject(type, data)}</h2>
          </div>
          <div class="content">
            <p>Hello ${data.recipientName},</p>
            <p>${message}</p>
            ${deadlineText}
            ${data.comments ? `<p><strong>Comments:</strong> ${data.comments}</p>` : ''}
            ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ''}
            ${data.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${data.rejectionReason}</p>` : ''}
            <div style="text-align: center; margin-top: 30px;">
              ${actionButton}
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Ezify Cloud.</p>
            <p>If you have any questions, please contact your administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}


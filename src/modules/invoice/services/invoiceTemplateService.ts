// Invoice template service

import prisma from '../../../lib/prisma';

export interface CreateInvoiceTemplateInput {
  name: string;
  description?: string;
  config: any;
  workspaceId?: string;
  isDefault?: boolean;
}

export interface UpdateInvoiceTemplateInput {
  name?: string;
  description?: string;
  config?: any;
  isDefault?: boolean;
}

export class InvoiceTemplateService {
  /**
   * Get all templates for a workspace (or default templates)
   */
  static async getTemplates(workspaceId?: string, userId?: string) {
    const where: any = {
      OR: workspaceId
        ? [{ workspaceId }, { workspaceId: null }] // Workspace templates + default templates
        : [{ workspaceId: null }], // Only default templates if no workspace
    };

    return prisma.invoiceTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  /**
   * Get template by ID
   */
  static async getTemplateById(templateId: string, userId: string) {
    const template = await prisma.invoiceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Check access (workspace members can access workspace templates or default templates)
    if (template.workspaceId) {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: template.workspaceId,
          userId,
        },
      });

      if (!member) {
        throw new Error('You do not have access to this template');
      }
    }

    return template;
  }

  /**
   * Create new template
   */
  static async createTemplate(userId: string, data: CreateInvoiceTemplateInput) {
    // If setting as default, unset other defaults in same workspace
    if (data.isDefault) {
      await prisma.invoiceTemplate.updateMany({
        where: { workspaceId: data.workspaceId || null },
        data: { isDefault: false },
      });
    }

    return prisma.invoiceTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        config: data.config as any,
        workspaceId: data.workspaceId,
        isDefault: data.isDefault || false,
        createdBy: userId,
      },
    });
  }

  /**
   * Update template
   */
  static async updateTemplate(
    templateId: string,
    userId: string,
    data: UpdateInvoiceTemplateInput
  ) {
    const template = await this.getTemplateById(templateId, userId);

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.invoiceTemplate.updateMany({
        where: {
          workspaceId: template.workspaceId,
          id: { not: templateId },
        },
        data: { isDefault: false },
      });
    }

    return prisma.invoiceTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        description: data.description,
        config: data.config as any,
        isDefault: data.isDefault,
      },
    });
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId: string, userId: string) {
    await this.getTemplateById(templateId, userId); // Check access

    return prisma.invoiceTemplate.delete({
      where: { id: templateId },
    });
  }

  /**
   * Set template as default
   */
  static async setDefaultTemplate(templateId: string, userId: string) {
    const template = await this.getTemplateById(templateId, userId);

    // Unset other defaults in same workspace
    await prisma.invoiceTemplate.updateMany({
      where: {
        workspaceId: template.workspaceId,
        id: { not: templateId },
      },
      data: { isDefault: false },
    });

    return prisma.invoiceTemplate.update({
      where: { id: templateId },
      data: { isDefault: true },
    });
  }

  /**
   * Create default template if none exists
   */
  static async ensureDefaultTemplate() {
    const defaultTemplate = await prisma.invoiceTemplate.findFirst({
      where: { isDefault: true, workspaceId: null },
    });

    if (!defaultTemplate) {
      // Create a default template
      const defaultConfig = {
        header: {
          showLogo: false,
          logoPosition: 'left',
          companyName: '',
          companyTagline: '',
        },
        companyInfo: {
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          phone: '',
          email: '',
          website: '',
          taxId: '',
          registrationNumber: '',
        },
        invoiceDetails: {
          showInvoiceNumber: true,
          showInvoiceDate: true,
          showDueDate: true,
          showStatus: true,
          showTerms: true,
        },
        clientInfo: {
          showClientSection: true,
          title: 'Bill To',
          fields: ['name', 'address', 'email', 'phone'],
        },
        lineItems: {
          showTable: true,
          columns: ['description', 'quantity', 'unitPrice', 'tax', 'total'],
          showSubtotal: true,
          showTax: true,
          showDiscount: true,
        },
        footer: {
          showTerms: true,
          termsAndConditions: 'Payment is due within 30 days. Late payments may incur a fee.',
          showNotes: true,
          notesLabel: 'Notes',
          showPaymentInfo: false,
          paymentInfo: '',
        },
        styling: {
          primaryColor: '#000000',
          secondaryColor: '#666666',
          fontFamily: 'Inter',
          fontSize: 'medium',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          numberFormat: 'en-US',
        },
      };

      return prisma.invoiceTemplate.create({
        data: {
          name: 'Default Invoice Template',
          description: 'Default invoice template',
          config: defaultConfig as any,
          isDefault: true,
          workspaceId: null,
          createdBy: 'system',
        },
      });
    }

    return defaultTemplate;
  }
}


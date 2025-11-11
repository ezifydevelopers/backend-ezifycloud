import {
  TextGenerationRequest,
  SmartSearchRequest,
  PredictionRequest,
  InsightRequest,
  AutoTaggingRequest,
  FormulaSuggestionRequest,
  EmailDraftRequest,
  AIGenerationResponse,
  SmartSearchResponse,
  PredictionResponse,
  InsightResponse,
  AutoTaggingResponse,
  FormulaSuggestionResponse,
  EmailDraftResponse,
} from '../types';
import { PrismaClient, ApprovalStatus } from '@prisma/client';

const prisma = new PrismaClient();

// OpenAI API Key from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt: string, systemPrompt?: string, maxTokens = 500): Promise<string> {
  if (!OPENAI_API_KEY) {
    // Fallback: Return placeholder text if API key not configured
    console.warn('OpenAI API key not configured. Returning placeholder response.');
    return generatePlaceholderResponse(prompt, systemPrompt);
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    // Fallback to placeholder
    return generatePlaceholderResponse(prompt, systemPrompt);
  }
}

/**
 * Generate placeholder response when AI is not configured
 */
function generatePlaceholderResponse(prompt: string, systemPrompt?: string): string {
  // Simple rule-based fallback responses
  if (systemPrompt?.includes('description')) {
    return 'Auto-generated description based on item data. (Configure OpenAI API key for AI-powered generation)';
  }
  if (systemPrompt?.includes('comment')) {
    return 'Suggested comment based on recent changes. (Configure OpenAI API key for AI-powered suggestions)';
  }
  if (systemPrompt?.includes('email')) {
    return 'Dear Client,\n\nWe are writing regarding your invoice. Please see details below.\n\nBest regards,\nTeam';
  }
  return 'AI-generated content. (Configure OpenAI API key for enhanced features)';
}

export class AIService {
  /**
   * Generate text using AI
   */
  static async generateText(request: TextGenerationRequest): Promise<AIGenerationResponse> {
    const { type, context } = request;

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'description':
        systemPrompt = 'You are a helpful assistant that generates professional invoice descriptions. Be concise, accurate, and professional.';
        const lineItems = context?.lineItems || [];
        const category = context?.category || 'general';
        const itemName = context?.itemName || 'Item';
        const mode = context?.mode || 'generate'; // 'generate', 'suggest', 'improve'
        
        if (mode === 'improve' && context?.existingText) {
          // Improve existing description
          userPrompt = `Improve and enhance this invoice description to be more professional and clear:\n\n"${context.existingText}"\n\n`;
          if (lineItems.length > 0) {
            userPrompt += `Context: Line items include ${lineItems.map(li => `${li.name || li.description || 'Item'}`).join(', ')}. `;
          }
          if (category !== 'general') {
            userPrompt += `Category: ${category}. `;
          }
          userPrompt += `Make the description more detailed and professional while keeping it concise.`;
        } else if (mode === 'suggest' && category !== 'general') {
          // Suggest based on category
          userPrompt = `Suggest a professional invoice description for ${itemName} in the ${category} category.`;
          if (lineItems.length > 0) {
            userPrompt += `\nLine items: ${lineItems.map(li => {
              const desc = li.name || li.description || 'Item';
              const qty = li.quantity || 1;
              const price = li.price || li.unitPrice || 0;
              return `${desc} (Qty: ${qty}, Price: ${price})`;
            }).join(', ')}`;
          }
          userPrompt += `\nGenerate a category-appropriate description that reflects typical ${category} services or products.`;
        } else {
          // Auto-generate from line items
          if (lineItems.length > 0) {
            const totalAmount = lineItems.reduce((sum, li) => {
              const qty = li.quantity || 1;
              const price = li.price || li.unitPrice || 0;
              return sum + (qty * price);
            }, 0);
            
            userPrompt = `Generate a professional invoice description based on these line items:\n\n`;
            lineItems.forEach((li, idx) => {
              const desc = li.name || li.description || 'Item';
              const qty = li.quantity || 1;
              const price = li.price || li.unitPrice || 0;
              const subtotal = qty * price;
              userPrompt += `${idx + 1}. ${desc} - Quantity: ${qty}, Unit Price: ${price}, Subtotal: ${subtotal}\n`;
            });
            userPrompt += `\nTotal Amount: ${totalAmount}\n`;
            if (category !== 'general') {
              userPrompt += `Category: ${category}\n`;
            }
            userPrompt += `\nCreate a comprehensive description that summarizes these line items professionally.`;
          } else {
            userPrompt = `Generate a professional description for ${itemName}${category !== 'general' ? ` in the ${category} category` : ''}.`;
            if (context?.existingText) {
              userPrompt += `\nUse this as reference: ${context.existingText}`;
            }
          }
        }
        break;

      case 'comment':
        systemPrompt = 'You are a helpful assistant that suggests professional comments for work items. Be brief, actionable, and contextually appropriate.';
        const changes = context?.itemData || context?.columnValues || {};
        const previousComments = context?.previousComments || [];
        const commentMode = context?.mode || 'suggest'; // 'suggest', 'reply', 'summarize'
        
        if (commentMode === 'summarize' && previousComments.length > 0) {
          // Summarize long discussions
          userPrompt = `Summarize this discussion thread into a concise summary:\n\n`;
          previousComments.forEach((c: any, idx: number) => {
            const author = c.author || c.user?.name || 'User';
            const content = typeof c === 'string' ? c : (c.content || '');
            userPrompt += `${idx + 1}. ${author}: ${content}\n\n`;
          });
          userPrompt += `\nCreate a brief summary highlighting the key points, decisions made, and any action items.`;
        } else if (commentMode === 'reply' && previousComments.length > 0) {
          // Auto-reply suggestions
          const lastComment = previousComments[previousComments.length - 1];
          const lastAuthor = lastComment?.author || lastComment?.user?.name || 'User';
          const lastContent = typeof lastComment === 'string' ? lastComment : (lastComment?.content || '');
          
          userPrompt = `Suggest a professional reply to this comment:\n\n"${lastContent}"\n\nby ${lastAuthor}\n\n`;
          if (previousComments.length > 1) {
            userPrompt += `Previous discussion context:\n`;
            previousComments.slice(0, -1).forEach((c: any, idx: number) => {
              const author = c.author || c.user?.name || 'User';
              const content = typeof c === 'string' ? c : (c.content || '');
              userPrompt += `${author}: ${content}\n`;
            });
            userPrompt += `\n`;
          }
          userPrompt += `Suggest a helpful and professional reply that addresses the comment appropriately.`;
        } else {
          // Suggest comment based on changes
          const changedFields = Object.keys(changes);
          if (changedFields.length > 0) {
            userPrompt = `Suggest a professional comment based on these item changes:\n\n`;
            changedFields.forEach(field => {
              const value = changes[field];
              userPrompt += `- ${field}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
            });
            userPrompt += `\nGenerate a brief, professional comment that acknowledges these changes.`;
          } else {
            userPrompt = `Suggest a professional comment for this work item.`;
            if (context?.itemName) {
              userPrompt += `\nItem: ${context.itemName}`;
            }
          }
          
          if (previousComments.length > 0) {
            userPrompt += `\n\nPrevious comments:\n`;
            previousComments.slice(-3).forEach((c: any, idx: number) => {
              const author = c.author || c.user?.name || 'User';
              const content = typeof c === 'string' ? c : (c.content || '');
              userPrompt += `${author}: ${content}\n`;
            });
            userPrompt += `\nSuggest a relevant follow-up comment.`;
          }
        }
        break;

      case 'email':
        systemPrompt = 'You are a professional business communication assistant. Write clear, professional emails.';
        const recipient = context?.recipientName || 'Client';
        const tone = context?.tone || 'professional';
        
        userPrompt = `Write a ${tone} email to ${recipient}${context?.recipientEmail ? ` (${context.recipientEmail})` : ''} regarding an invoice.`;
        if (context?.itemName) {
          userPrompt += `\nInvoice/Item: ${context.itemName}`;
        }
        if (context?.itemData) {
          userPrompt += `\nDetails: ${JSON.stringify(context.itemData)}`;
        }
        break;

      case 'summary':
        systemPrompt = 'You are a helpful assistant that creates concise summaries of work items and discussions.';
        const itemsToSummarize = context?.itemData ? JSON.stringify(context.itemData) : '';
        userPrompt = `Create a brief summary${itemsToSummarize ? ` of: ${itemsToSummarize}` : ''}.`;
        break;
    }

    const generatedText = await callOpenAI(userPrompt, systemPrompt);

    return {
      text: generatedText,
      confidence: OPENAI_API_KEY ? 0.85 : 0.5,
      metadata: {
        type,
        hasAIConfigured: !!OPENAI_API_KEY,
      },
    };
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Parse date range from natural language
   */
  private static parseDateRange(query: string): { start?: Date; end?: Date } | null {
    const lowerQuery = query.toLowerCase();
    const now = new Date();
    const result: { start?: Date; end?: Date } = {};

    // Last month
    if (lowerQuery.includes('last month') || lowerQuery.includes('past month')) {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end };
    }

    // Last week
    if (lowerQuery.includes('last week') || lowerQuery.includes('past week')) {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }

    // Last 30 days
    if (lowerQuery.includes('last 30 days') || lowerQuery.includes('past 30 days')) {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }

    // This month
    if (lowerQuery.includes('this month')) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start, end: now };
    }

    // This week
    if (lowerQuery.includes('this week')) {
      const start = new Date(now);
      start.setDate(start.getDate() - (now.getDay() || 7) + 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }

    // Specific date patterns (e.g., "from January 2024", "in 2024")
    const yearMatch = query.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return { start, end };
    }

    return null;
  }

  /**
   * Parse amount range from natural language
   */
  private static parseAmountRange(query: string): { min?: number; max?: number } | null {
    const amountPatterns = [
      // Over $X, above $X, more than $X
      { pattern: /(?:over|above|more than|greater than)\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: 'gte' as const },
      // Under $X, below $X, less than $X
      { pattern: /(?:under|below|less than)\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: 'lte' as const },
      // Between $X and $Y
      { pattern: /between\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:and|to)\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: 'between' as const },
      // Exactly $X
      { pattern: /(?:exactly|equal to)\s*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, type: 'equal' as const },
    ];

    for (const { pattern, type } of amountPatterns) {
      const match = query.match(pattern);
      if (match) {
        if (type === 'between' && match[1] && match[2]) {
          const min = parseFloat(match[1].replace(/,/g, ''));
          const max = parseFloat(match[2].replace(/,/g, ''));
          return { min, max };
        } else if (match[1]) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (type === 'gte') return { min: amount };
          if (type === 'lte') return { max: amount };
          if (type === 'equal') return { min: amount, max: amount };
        }
      }
    }

    return null;
  }

  /**
   * Smart semantic search with enhanced natural language parsing
   */
  static async smartSearch(request: SmartSearchRequest): Promise<SmartSearchResponse> {
    const { query, boardId, workspaceId, limit = 10 } = request;

    // Parse natural language query
    const lowerQuery = query.toLowerCase();
    const keywords: string[] = [];
    const filters: Record<string, unknown> = {};
    const whereClause: any = {};

    // Board/Workspace filter
    if (boardId) {
      whereClause.boardId = boardId;
    } else if (workspaceId) {
      whereClause.board = { workspaceId };
    }

    // Status filters
    if (lowerQuery.includes('unpaid') || lowerQuery.includes('not paid') || lowerQuery.includes('not yet paid')) {
      whereClause.status = { not: 'Paid' };
      filters.status = { not: 'Paid' };
    }
    if (lowerQuery.includes('paid') && !lowerQuery.includes('unpaid')) {
      whereClause.status = 'Paid';
      filters.status = 'Paid';
    }
    if (lowerQuery.includes('pending') || lowerQuery.includes('waiting') || lowerQuery.includes('awaiting')) {
      whereClause.status = { in: ['Pending', 'Awaiting Approval', 'In Review'] };
      filters.status = { in: ['Pending', 'Awaiting Approval', 'In Review'] };
    }
    if (lowerQuery.includes('approved') && !lowerQuery.includes('pending approval')) {
      whereClause.status = { in: ['Approved', 'Approved - Pending Payment'] };
      filters.status = { in: ['Approved', 'Approved - Pending Payment'] };
    }
    if (lowerQuery.includes('rejected') || lowerQuery.includes('declined')) {
      whereClause.status = { in: ['Rejected', 'Declined'] };
      filters.status = { in: ['Rejected', 'Declined'] };
    }
    if (lowerQuery.includes('overdue')) {
      whereClause.status = 'Overdue';
      filters.status = 'Overdue';
    }

    // Date range parsing
    const dateRange = this.parseDateRange(query);
    if (dateRange) {
      if (dateRange.start && dateRange.end) {
        whereClause.createdAt = { gte: dateRange.start, lte: dateRange.end };
        filters.dateRange = { start: dateRange.start, end: dateRange.end };
      } else if (dateRange.start) {
        whereClause.createdAt = { gte: dateRange.start };
        filters.dateRange = { start: dateRange.start };
      }
    }

    // Amount range parsing
    const amountRange = this.parseAmountRange(query);
    if (amountRange) {
      // We'll need to search in cells for amount values
      filters.amountRange = amountRange;
    }

    // Extract meaningful keywords (exclude stop words)
    const stopWords = ['show', 'find', 'list', 'get', 'the', 'a', 'an', 'from', 'to', 'and', 'or', 
                       'invoices', 'invoice', 'items', 'item', 'that', 'which', 'with', 'for'];
    const words = query.split(/\s+/).filter(w => {
      const word = w.toLowerCase().replace(/[^\w]/g, '');
      return word.length > 2 && !stopWords.includes(word);
    });
    keywords.push(...words);

    // Build search query
    try {
      // First, get items matching basic filters
      let items = await prisma.item.findMany({
        where: whereClause,
        include: {
          cells: {
            include: {
              column: true,
            },
          },
          board: {
            select: {
              id: true,
              name: true,
              workspaceId: true,
            },
          },
        },
        take: limit * 3, // Get more to filter and rank
        orderBy: { createdAt: 'desc' },
      });

      // Filter by amount if specified
      if (amountRange) {
        items = items.filter(item => {
          // Find amount cell
          const amountCell = item.cells.find(c => 
            c.column.type === 'NUMBER' || 
            c.column.name.toLowerCase().includes('amount') ||
            c.column.name.toLowerCase().includes('total') ||
            c.column.name.toLowerCase().includes('price')
          );
          
          if (amountCell && amountCell.value) {
            const amount = typeof amountCell.value === 'number' 
              ? amountCell.value 
              : parseFloat(String(amountCell.value)) || 0;
            
            if (amountRange.min !== undefined && amount < amountRange.min) return false;
            if (amountRange.max !== undefined && amount > amountRange.max) return false;
            return true;
          }
          return false;
        });
      }

      // Calculate relevance scores with fuzzy matching
      const results = items.map(item => {
        let score = 0.3; // Base score
        const itemText = `${item.name} ${item.status || ''}`.toLowerCase();
        const itemCellsText = item.cells.map(c => {
          const value = c.value;
          if (typeof value === 'string') return value;
          if (typeof value === 'number') return value.toString();
          return '';
        }).join(' ').toLowerCase();
        const fullText = `${itemText} ${itemCellsText}`;

        // Exact keyword matches (highest weight)
        keywords.forEach(keyword => {
          const keywordLower = keyword.toLowerCase();
          if (itemText.includes(keywordLower)) {
            score += 0.3; // Name match is important
          }
          if (itemCellsText.includes(keywordLower)) {
            score += 0.15; // Cell content match
          }
        });

        // Fuzzy matching for similar words
        if (keywords.length > 0) {
          keywords.forEach(keyword => {
            const keywordLower = keyword.toLowerCase();
            const words = fullText.split(/\s+/);
            words.forEach(word => {
              if (word.length > 3 && keywordLower.length > 3) {
                const distance = this.levenshteinDistance(keywordLower, word);
                const maxLen = Math.max(keywordLower.length, word.length);
                const similarity = 1 - (distance / maxLen);
                if (similarity > 0.7) { // 70% similarity threshold
                  score += 0.1 * similarity;
                }
              }
            });
          });
        }

        // Status filter boost
        if (filters.status && item.status) {
          score += 0.2;
        }

        // Date recency boost (more recent = slightly higher)
        const daysSinceCreation = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) {
          score += 0.05;
        }

        // Find matched fields
        const matchedFields: string[] = [];
        keywords.forEach(keyword => {
          const keywordLower = keyword.toLowerCase();
          if (item.name.toLowerCase().includes(keywordLower)) {
            matchedFields.push('name');
          }
          if (item.status?.toLowerCase().includes(keywordLower)) {
            matchedFields.push('status');
          }
        });

        // Generate snippet
        let snippet = item.name;
        if (keywords.length > 0 && item.cells.length > 0) {
          const firstKeyword = keywords[0].toLowerCase();
          const matchingCell = item.cells.find(c => {
            const value = String(c.value || '').toLowerCase();
            return value.includes(firstKeyword);
          });
          if (matchingCell) {
            snippet = `${item.name} - ${String(matchingCell.value).substring(0, 50)}...`;
          }
        }

        return {
          itemId: item.id,
          itemName: item.name,
          relevanceScore: Math.min(score, 1.0),
          matchedFields: Array.from(new Set(matchedFields)),
          snippet,
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);

      // Try to interpret query with AI
      let queryInterpretation: string | undefined;
      if (OPENAI_API_KEY && query.length > 10) {
        try {
          queryInterpretation = await callOpenAI(
            `Interpret this search query for an invoice management system and explain what the user is looking for in one sentence: "${query}"`,
            'You are a search query interpreter for business software. Be concise and professional.',
            80
          );
        } catch (error) {
          console.error('Failed to interpret query:', error);
        }
      }

      return {
        results,
        queryInterpretation,
        suggestedFilters: Object.keys(filters).length > 0 ? filters : undefined,
      };
    } catch (error) {
      console.error('Smart search error:', error);
      return { results: [] };
    }
  }

  /**
   * Analyze approval history for similar items
   */
  private static async analyzeApprovalHistory(itemId?: string, itemData?: Record<string, unknown>): Promise<{
    averageApprovalDays: number;
    averageApprovalHours: number;
    totalApprovals: number;
    averageByAmount: Map<string, number>; // Amount ranges -> days
    averageByType: Map<string, number>; // Type/category -> days
    averageByLevel: Map<string, number>; // Approval level -> days
  }> {
    try {
      // Get approval history from database
      const approvals = await prisma.approval.findMany({
        where: {
          status: {
            in: [ApprovalStatus.approved, ApprovalStatus.rejected], // Only completed approvals
          },
          approvedAt: {
            not: null,
          },
        },
        include: {
          item: {
            include: {
              cells: {
                include: {
                  column: true,
                },
              },
            },
          },
        },
        take: 200, // Get recent approvals for analysis
        orderBy: { createdAt: 'desc' },
      });

      if (approvals.length === 0) {
        return {
          averageApprovalDays: 3,
          averageApprovalHours: 72,
          totalApprovals: 0,
          averageByAmount: new Map(),
          averageByType: new Map(),
          averageByLevel: new Map(),
        };
      }

      // Calculate statistics
      let totalDays = 0;
      let totalHours = 0;
      let completedCount = 0;
      const amountRanges: Map<string, number[]> = new Map();
      const typeGroups: Map<string, number[]> = new Map();
      const levelGroups: Map<string, number[]> = new Map();

      for (const approval of approvals) {
        if (!approval.approvedAt) continue;

        const approvalTimeMs = approval.approvedAt.getTime() - approval.createdAt.getTime();
        const approvalHours = approvalTimeMs / (1000 * 60 * 60);
        const approvalDays = approvalHours / 24;

        totalHours += approvalHours;
        totalDays += approvalDays;
        completedCount++;

        // Group by amount
        const amountCell = approval.item.cells.find(c =>
          c.column.type === 'NUMBER' ||
          c.column.name.toLowerCase().includes('amount') ||
          c.column.name.toLowerCase().includes('total') ||
          c.column.name.toLowerCase().includes('price')
        );
        if (amountCell && amountCell.value) {
          const amount = typeof amountCell.value === 'number'
            ? amountCell.value
            : parseFloat(String(amountCell.value)) || 0;

          let range = 'unknown';
          if (amount > 50000) range = 'very_high';
          else if (amount > 10000) range = 'high';
          else if (amount > 5000) range = 'moderate';
          else if (amount > 1000) range = 'low';
          else range = 'very_low';

          if (!amountRanges.has(range)) amountRanges.set(range, []);
          amountRanges.get(range)!.push(approvalDays);
        }

        // Group by type/category
        const categoryCell = approval.item.cells.find(c =>
          c.column.type === 'DROPDOWN' ||
          c.column.type === 'MULTI_SELECT' ||
          c.column.name.toLowerCase().includes('category') ||
          c.column.name.toLowerCase().includes('type')
        );
        if (categoryCell && categoryCell.value) {
          const category = String(categoryCell.value).toLowerCase();
          if (!typeGroups.has(category)) typeGroups.set(category, []);
          typeGroups.get(category)!.push(approvalDays);
        }

        // Group by approval level
        const level = approval.level;
        if (!levelGroups.has(level)) levelGroups.set(level, []);
        levelGroups.get(level)!.push(approvalDays);
      }

      // Calculate averages
      const averageApprovalDays = completedCount > 0 ? totalDays / completedCount : 3;
      const averageApprovalHours = completedCount > 0 ? totalHours / completedCount : 72;

      const averageByAmount = new Map<string, number>();
      amountRanges.forEach((days, range) => {
        averageByAmount.set(range, days.reduce((a, b) => a + b, 0) / days.length);
      });

      const averageByType = new Map<string, number>();
      typeGroups.forEach((days, type) => {
        averageByType.set(type, days.reduce((a, b) => a + b, 0) / days.length);
      });

      const averageByLevel = new Map<string, number>();
      levelGroups.forEach((days, level) => {
        averageByLevel.set(level, days.reduce((a, b) => a + b, 0) / days.length);
      });

      return {
        averageApprovalDays,
        averageApprovalHours,
        totalApprovals: completedCount,
        averageByAmount,
        averageByType,
        averageByLevel,
      };
    } catch (error) {
      console.error('Error analyzing approval history:', error);
      return {
        averageApprovalDays: 3,
        averageApprovalHours: 72,
        totalApprovals: 0,
        averageByAmount: new Map(),
        averageByType: new Map(),
        averageByLevel: new Map(),
      };
    }
  }

  /**
   * Analyze client payment history
   */
  private static async analyzeClientHistory(clientId?: string): Promise<{
    averageDelayDays: number;
    onTimeRate: number;
    totalInvoices: number;
    lateInvoices: number;
  }> {
    if (!clientId) {
      return { averageDelayDays: 0, onTimeRate: 1.0, totalInvoices: 0, lateInvoices: 0 };
    }

    try {
      // Find all items with cells that might contain the client ID
      // We'll filter in memory since Prisma JSON queries are limited
      const allItems = await prisma.item.findMany({
        where: {
          status: {
            in: ['Paid', 'Overdue', 'Partially Paid'],
          },
        },
        include: {
          cells: {
            include: {
              column: true,
            },
          },
        },
        take: 500, // Get a reasonable number to filter
        orderBy: { createdAt: 'desc' },
      });

      // Filter items that have the client ID in any PEOPLE or TEXT cell
      const clientItems = allItems.filter(item => {
        return item.cells.some(cell => {
          if (!cell.value) return false;
          
          // Check if value is an array (PEOPLE column)
          if (Array.isArray(cell.value)) {
            return cell.value.some(v => String(v) === clientId);
          }
          
          // Check if value is a string containing the client ID
          if (typeof cell.value === 'string') {
            return cell.value === clientId || cell.value.includes(clientId);
          }
          
          // Check if value matches directly
          return String(cell.value) === clientId;
        });
      }).slice(0, 100); // Limit to 100 for performance

      if (clientItems.length === 0) {
        return { averageDelayDays: 0, onTimeRate: 1.0, totalInvoices: 0, lateInvoices: 0 };
      }

      // Calculate payment statistics
      let totalDelayDays = 0;
      let onTimeCount = 0;
      let lateCount = 0;
      let itemsWithDates = 0;

      for (const item of clientItems) {
        // Find due date and paid date
        const dueDateCell = item.cells.find(c => 
          c.column.name.toLowerCase().includes('due') ||
          c.column.type === 'DATE'
        );
        const paidDateCell = item.cells.find(c => 
          c.column.name.toLowerCase().includes('paid') ||
          (item.status === 'Paid' && c.column.type === 'DATE')
        );

        if (dueDateCell && dueDateCell.value) {
          const dueDate = new Date(String(dueDateCell.value));
          const paidDate = paidDateCell && paidDateCell.value 
            ? new Date(String(paidDateCell.value))
            : item.status === 'Paid' 
              ? new Date(item.updatedAt) 
              : null;

          if (paidDate && !isNaN(dueDate.getTime()) && !isNaN(paidDate.getTime())) {
            const delayDays = Math.max(0, Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
            totalDelayDays += delayDays;
            itemsWithDates++;

            if (delayDays === 0) {
              onTimeCount++;
            } else {
              lateCount++;
            }
          }
        }
      }

      const averageDelayDays = itemsWithDates > 0 ? totalDelayDays / itemsWithDates : 0;
      const onTimeRate = itemsWithDates > 0 ? onTimeCount / itemsWithDates : 1.0;

      return {
        averageDelayDays,
        onTimeRate,
        totalInvoices: clientItems.length,
        lateInvoices: lateCount,
      };
    } catch (error) {
      console.error('Error analyzing client history:', error);
      return { averageDelayDays: 0, onTimeRate: 1.0, totalInvoices: 0, lateInvoices: 0 };
    }
  }

  /**
   * Generate predictions with enhanced payment delay analysis
   */
  static async generatePrediction(request: PredictionRequest): Promise<PredictionResponse> {
    const { type, itemId, itemData } = request;

    switch (type) {
      case 'payment_delay': {
        let delayProbability = 0.3; // Base 30%
        let factors: Array<{ factor: string; impact: number }> = [];
        let confidence = 0.7;

        // Analyze based on invoice amount
        if (itemData?.amount) {
          const amount = typeof itemData.amount === 'number' ? itemData.amount : parseFloat(String(itemData.amount)) || 0;
          
          if (amount > 50000) {
            delayProbability += 0.25;
            factors.push({ factor: 'Very high amount (>$50k)', impact: 0.25 });
          } else if (amount > 10000) {
            delayProbability += 0.15;
            factors.push({ factor: 'High amount (>$10k)', impact: 0.15 });
          } else if (amount > 5000) {
            delayProbability += 0.08;
            factors.push({ factor: 'Moderate amount (>$5k)', impact: 0.08 });
          } else if (amount < 1000) {
            delayProbability -= 0.1;
            factors.push({ factor: 'Low amount (<$1k)', impact: -0.1 });
          }
        }

        // Analyze client history
        if (itemData?.clientId || itemId) {
          let clientId = itemData?.clientId as string | undefined;
          
          // If we have itemId but no clientId, try to find it
          if (!clientId && itemId) {
            try {
              const item = await prisma.item.findUnique({
                where: { id: itemId },
                include: {
                  cells: {
                    include: {
                      column: true,
                    },
                  },
                },
              });

              // Try to find client ID from cells
              const clientCell = item?.cells.find(c => 
                c.column.name.toLowerCase().includes('client') ||
                c.column.type === 'PEOPLE'
              );
              
              if (clientCell?.value) {
                if (Array.isArray(clientCell.value)) {
                  clientId = clientCell.value[0] as string;
                } else {
                  clientId = String(clientCell.value);
                }
              }
            } catch (error) {
              console.error('Error fetching item for client ID:', error);
            }
          }

          if (clientId) {
            const clientHistory = await this.analyzeClientHistory(clientId);
            
            if (clientHistory.totalInvoices > 0) {
              // Use client's on-time rate to adjust probability
              const historyDelayBoost = (1 - clientHistory.onTimeRate) * 0.3;
              delayProbability += historyDelayBoost;
              
              factors.push({
                factor: `Client on-time rate: ${Math.round(clientHistory.onTimeRate * 100)}%`,
                impact: historyDelayBoost,
              });

              if (clientHistory.averageDelayDays > 0) {
                factors.push({
                  factor: `Average delay: ${Math.round(clientHistory.averageDelayDays)} days`,
                  impact: Math.min(clientHistory.averageDelayDays / 30, 0.2),
                });
                delayProbability += Math.min(clientHistory.averageDelayDays / 30, 0.2);
              }

              // Increase confidence with more historical data
              confidence = Math.min(0.85, 0.7 + (clientHistory.totalInvoices / 50) * 0.15);
            } else {
              factors.push({
                factor: 'No payment history available',
                impact: 0,
              });
              confidence = 0.5; // Lower confidence for new clients
            }
          }
        }

        // Adjust based on due date proximity
        if (itemData?.dueDate) {
          const dueDate = new Date(String(itemData.dueDate));
          const now = new Date();
          const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue < 0) {
            delayProbability += 0.2; // Already past due
            factors.push({ factor: 'Already past due date', impact: 0.2 });
          } else if (daysUntilDue < 7) {
            delayProbability += 0.1; // Due soon
            factors.push({ factor: 'Due within 7 days', impact: 0.1 });
          }
        }

        // Cap probability
        delayProbability = Math.min(Math.max(delayProbability, 0.05), 0.95);
        
        // Calculate risk score (0-100)
        const riskScore = Math.round(delayProbability * 100);
        
        return {
          prediction: riskScore,
          confidence,
          factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
          recommendation: delayProbability > 0.7 
            ? 'High risk - Send payment reminder immediately and consider follow-up call' 
            : delayProbability > 0.5
            ? 'Moderate risk - Consider sending payment reminder early'
            : delayProbability > 0.3
            ? 'Low-moderate risk - Monitor payment status'
            : 'Low risk - Payment likely on time',
        };
      }

      case 'approval_time': {
        let estimatedDays = 3; // Base 3 days
        let factors: Array<{ factor: string; impact: number }> = [];
        let confidence = 0.6;

        // Analyze approval history
        const approvalHistory = await this.analyzeApprovalHistory(itemId, itemData);
        
        if (approvalHistory.totalApprovals > 0) {
          // Use historical average as base
          estimatedDays = approvalHistory.averageApprovalDays;
          factors.push({
            factor: `Historical average: ${approvalHistory.averageApprovalDays.toFixed(1)} days`,
            impact: 0,
          });
          confidence = Math.min(0.85, 0.6 + (approvalHistory.totalApprovals / 100) * 0.25);
        }

        // Adjust based on amount
        if (itemData?.amount) {
          const amount = typeof itemData.amount === 'number' 
            ? itemData.amount 
            : parseFloat(String(itemData.amount)) || 0;

          let amountImpact = 0;
          let amountRange = 'unknown';

          if (amount > 50000) {
            amountRange = 'very_high';
            amountImpact = 3;
          } else if (amount > 10000) {
            amountRange = 'high';
            amountImpact = 2;
          } else if (amount > 5000) {
            amountRange = 'moderate';
            amountImpact = 1;
          } else if (amount > 1000) {
            amountRange = 'low';
            amountImpact = 0;
          } else {
            amountRange = 'very_low';
            amountImpact = -0.5;
          }

          // Use historical data for this amount range if available
          if (approvalHistory.averageByAmount.has(amountRange)) {
            const historicalAvg = approvalHistory.averageByAmount.get(amountRange)!;
            estimatedDays = (estimatedDays * 0.4) + (historicalAvg * 0.6); // Weighted average
            factors.push({
              factor: `Amount range (${amountRange}): ${historicalAvg.toFixed(1)} days avg`,
              impact: historicalAvg - 3,
            });
          } else {
            estimatedDays += amountImpact;
            factors.push({
              factor: `Amount: ${amount > 50000 ? 'Very high' : amount > 10000 ? 'High' : amount > 5000 ? 'Moderate' : 'Low'}`,
              impact: amountImpact,
            });
          }
        }

        // Adjust based on type/category
        if (itemId) {
          try {
            const item = await prisma.item.findUnique({
              where: { id: itemId },
              include: {
                cells: {
                  include: {
                    column: true,
                  },
                },
              },
            });

            const categoryCell = item?.cells.find(c =>
              c.column.type === 'DROPDOWN' ||
              c.column.type === 'MULTI_SELECT' ||
              c.column.name.toLowerCase().includes('category') ||
              c.column.name.toLowerCase().includes('type')
            );

            if (categoryCell && categoryCell.value) {
              const category = String(categoryCell.value).toLowerCase();
              
              if (approvalHistory.averageByType.has(category)) {
                const typeAvg = approvalHistory.averageByType.get(category)!;
                estimatedDays = (estimatedDays * 0.5) + (typeAvg * 0.5);
                factors.push({
                  factor: `Category (${category}): ${typeAvg.toFixed(1)} days avg`,
                  impact: typeAvg - 3,
                });
              }
            }
          } catch (error) {
            console.error('Error fetching item for type analysis:', error);
          }
        }

        // Adjust based on approval level (if multiple levels expected)
        // Assume average if multiple levels
        const level1Avg = approvalHistory.averageByLevel.get('LEVEL_1') || 1.5;
        const level2Avg = approvalHistory.averageByLevel.get('LEVEL_2') || 2;
        const level3Avg = approvalHistory.averageByLevel.get('LEVEL_3') || 2.5;

        // Check if item needs multiple levels (heuristic: based on amount)
        const amount = typeof itemData?.amount === 'number' 
          ? itemData.amount 
          : parseFloat(String(itemData?.amount || 0)) || 0;

        if (amount > 10000 && (approvalHistory.averageByLevel.has('LEVEL_2') || approvalHistory.averageByLevel.has('LEVEL_3'))) {
          // Likely needs multiple levels
          const totalLevels = (level1Avg || 1.5) + (level2Avg || 0) + (level3Avg || 0);
          estimatedDays = Math.max(estimatedDays, totalLevels);
          factors.push({
            factor: 'Multiple approval levels required',
            impact: totalLevels - 3,
          });
        }

        // Adjust based on current status
        if (itemData?.status) {
          const status = String(itemData.status).toLowerCase();
          if (status === 'pending' || status === 'awaiting approval') {
            // Already in approval, check how long it's been pending
            if (itemData?.createdDate) {
              const createdDate = new Date(String(itemData.createdDate));
              const daysPending = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysPending > estimatedDays) {
                estimatedDays = daysPending + 1; // Add 1 day buffer
                factors.push({
                  factor: `Already pending for ${daysPending} days`,
                  impact: daysPending - estimatedDays,
                });
              }
            }
          }
        }

        // Round to reasonable estimate
        estimatedDays = Math.max(0.5, Math.round(estimatedDays * 2) / 2); // Round to nearest 0.5 days

        return {
          prediction: `${estimatedDays} ${estimatedDays === 1 ? 'day' : 'days'}`,
          confidence,
          factors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
          recommendation: estimatedDays > 7
            ? 'Long approval expected - Consider sending reminder to approver after 3-4 days'
            : estimatedDays > 5
            ? 'Extended approval timeframe - Monitor progress'
            : estimatedDays > 3
            ? 'Normal approval timeframe'
            : 'Quick approval expected',
        };
      }

      case 'risk_score': {
        let riskScore = 0.3;
        if (itemData?.amount && itemData.amount > 50000) {
          riskScore += 0.2;
        }
        if (itemData?.status && ['Overdue', 'Rejected'].includes(String(itemData.status))) {
          riskScore += 0.3;
        }

        return {
          prediction: Math.round(riskScore * 100),
          confidence: 0.7,
          factors: [
            { factor: 'Amount', impact: itemData?.amount ? (itemData.amount > 50000 ? 0.2 : 0) : 0 },
          ],
          recommendation: riskScore > 0.6 
            ? 'High risk - requires attention' 
            : 'Low to moderate risk',
        };
      }

      default:
        return {
          prediction: 'N/A',
          confidence: 0,
        };
    }
  }

  /**
   * Calculate date range based on timeframe
   */
  private static getDateRange(timeframe?: 'week' | 'month' | 'quarter' | 'year'): { start: Date; end: Date } {
    const now = new Date();
    const end = now;
    const start = new Date();

    switch (timeframe) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setMonth(start.getMonth() - 1); // Default to last month
    }

    return { start, end };
  }

  /**
   * Generate insights and summaries with enhanced analysis
   */
  static async generateInsights(request: InsightRequest): Promise<InsightResponse> {
    const { type, boardId, workspaceId, timeframe } = request;
    const dateRange = this.getDateRange(timeframe);

    try {
      switch (type) {
        case 'board_summary': {
          // Get board details
          const board = boardId ? await prisma.board.findUnique({
            where: { id: boardId },
            select: {
              id: true,
              name: true,
              workspaceId: true,
            },
          }) : null;

          // Get all items for the board
          const items = await prisma.item.findMany({
            where: {
              boardId: boardId || undefined,
              deletedAt: null,
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            },
            include: {
              cells: {
                include: {
                  column: true,
                },
              },
              creator: {
                select: {
                  id: true,
                  name: true,
                },
              },
              _count: {
                select: {
                  comments: true,
                  files: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          });

          // Calculate metrics
          const totalItems = items.length;
          const statusCounts: Record<string, number> = {};
          const creatorCounts: Record<string, number> = {};
          let totalAmount = 0;
          let itemsWithAmount = 0;
          const statusChanges: Record<string, number> = {};
          const categoryCounts: Record<string, number> = {};

          items.forEach(item => {
            // Status distribution
            const status = item.status || 'No Status';
            statusCounts[status] = (statusCounts[status] || 0) + 1;

            // Creator distribution
            if (item.creator) {
              creatorCounts[item.creator.name || item.creator.id] = (creatorCounts[item.creator.name || item.creator.id] || 0) + 1;
            }

            // Amount aggregation
            const amountCell = item.cells.find(c =>
              c.column.type === 'NUMBER' ||
              c.column.name.toLowerCase().includes('amount') ||
              c.column.name.toLowerCase().includes('total') ||
              c.column.name.toLowerCase().includes('price')
            );
            if (amountCell && amountCell.value) {
              const amount = typeof amountCell.value === 'number'
                ? amountCell.value
                : parseFloat(String(amountCell.value)) || 0;
              if (amount > 0) {
                totalAmount += amount;
                itemsWithAmount++;
              }
            }

            // Category distribution
            const categoryCell = item.cells.find(c =>
              c.column.type === 'DROPDOWN' ||
              c.column.type === 'MULTI_SELECT' ||
              c.column.name.toLowerCase().includes('category') ||
              c.column.name.toLowerCase().includes('type')
            );
            if (categoryCell && categoryCell.value) {
              const category = String(categoryCell.value);
              categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            }
          });

          // Calculate trends (comparing first half vs second half of timeframe)
          const midPoint = new Date((dateRange.start.getTime() + dateRange.end.getTime()) / 2);
          const firstHalf = items.filter(item => new Date(item.createdAt) < midPoint).length;
          const secondHalf = items.filter(item => new Date(item.createdAt) >= midPoint).length;
          const growthRate = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

          // Identify trends
          const boardTrends: Array<{ label: string; description: string; direction: 'up' | 'down' | 'stable' }> = [];
          
          if (Math.abs(growthRate) > 10) {
            boardTrends.push({
              label: 'Item Creation',
              description: `${growthRate > 0 ? 'Increasing' : 'Decreasing'} by ${Math.abs(growthRate).toFixed(1)}%`,
              direction: growthRate > 0 ? 'up' : 'down',
            });
          } else {
            boardTrends.push({
              label: 'Item Creation',
              description: 'Stable growth pattern',
              direction: 'stable',
            });
          }

          // Most active status
          const mostCommonStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0];
          
          // Generate AI summary if available
          let boardAiSummary = '';
          if (OPENAI_API_KEY && items.length > 0) {
            try {
              const summaryPrompt = `Summarize this board's activity in the ${timeframe || 'last month'}:

Board: ${board?.name || 'Unknown'}
Total Items: ${totalItems}
Status Distribution: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
${itemsWithAmount > 0 ? `Total Amount: $${totalAmount.toLocaleString()}` : ''}
${Object.keys(categoryCounts).length > 0 ? `Categories: ${Object.keys(categoryCounts).join(', ')}` : ''}
Most Active Creator: ${Object.entries(creatorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}

Provide a concise 2-3 sentence summary highlighting key metrics and patterns.`;
              
              boardAiSummary = await callOpenAI(
                summaryPrompt,
                'You are a business intelligence analyst. Provide clear, actionable insights.',
                150
              );
            } catch (error) {
              console.error('Error generating AI summary:', error);
            }
          }

          const boardSummary = boardAiSummary || `This board contains ${totalItems} items created in the ${timeframe || 'last month'}. 
Status distribution: ${Object.entries(statusCounts).map(([status, count]) => `${status} (${count})`).join(', ')}.
${itemsWithAmount > 0 ? `Total value: $${totalAmount.toLocaleString()}.` : ''}`;

          // Build metrics
          const boardMetrics: Array<{ label: string; value: string | number }> = [
            { label: 'Total Items', value: totalItems },
            { label: 'Unique Statuses', value: Object.keys(statusCounts).length },
            { label: 'Active Creators', value: Object.keys(creatorCounts).length },
            { label: 'Total Comments', value: items.reduce((sum, item) => sum + item._count.comments, 0) },
            { label: 'Total Files', value: items.reduce((sum, item) => sum + item._count.files, 0) },
          ];

          if (itemsWithAmount > 0) {
            boardMetrics.push(
              { label: 'Total Amount', value: `$${totalAmount.toLocaleString()}` },
              { label: 'Average Amount', value: `$${Math.round(totalAmount / itemsWithAmount).toLocaleString()}` }
            );
          }

          // Build insights
          const boardInsights: string[] = [];
          if (mostCommonStatus) {
            boardInsights.push(`Most common status: ${mostCommonStatus[0]} (${mostCommonStatus[1]} items)`);
          }
          
          const topCreator = Object.entries(creatorCounts).sort((a, b) => b[1] - a[1])[0];
          if (topCreator) {
            boardInsights.push(`Most active creator: ${topCreator[0]} (${topCreator[1]} items)`);
          }

          if (Object.keys(categoryCounts).length > 0) {
            const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
            boardInsights.push(`Most common category: ${topCategory[0]} (${topCategory[1]} items)`);
          }

          if (growthRate > 20) {
            boardInsights.push(`Strong growth: ${growthRate.toFixed(1)}% increase in item creation`);
          } else if (growthRate < -20) {
            boardInsights.push(`Decreasing activity: ${Math.abs(growthRate).toFixed(1)}% decrease in item creation`);
          }

          return {
            summary: boardSummary,
            metrics: boardMetrics,
            trends: boardTrends,
            insights: boardInsights,
          };
        }

        case 'team_insights': {
          // Get approvals for approver statistics
          const approvals = await prisma.approval.findMany({
            where: {
              ...(workspaceId ? {
                item: {
                  board: {
                    workspaceId,
                  },
                },
              } : {}),
              ...(boardId ? {
                item: {
                  boardId,
                },
              } : {}),
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            },
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              item: {
                include: {
                  board: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          });

          // Get items for department/assignee statistics
          const teamItems = await prisma.item.findMany({
            where: {
              ...(workspaceId ? {
                board: {
                  workspaceId,
                },
              } : {}),
              ...(boardId ? { boardId } : {}),
              deletedAt: null,
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            },
            include: {
              cells: {
                include: {
                  column: true,
                },
              },
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          // Analyzer approver statistics
          const approverStats: Record<string, {
            totalApprovals: number;
            approved: number;
            rejected: number;
            pending: number;
            averageTimeHours: number;
          }> = {};

          approvals.forEach(approval => {
            if (!approval.approver) return;
            
            const approverId = approval.approver.id;
            const approverName = approval.approver.name || approval.approver.email;

            if (!approverStats[approverId]) {
              approverStats[approverId] = {
                totalApprovals: 0,
                approved: 0,
                rejected: 0,
                pending: 0,
                averageTimeHours: 0,
              };
            }

            approverStats[approverId].totalApprovals++;
            
            if (approval.status === ApprovalStatus.approved) {
              approverStats[approverId].approved++;
              if (approval.approvedAt) {
                const timeHours = (approval.approvedAt.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
                const currentAvg = approverStats[approverId].averageTimeHours;
                const count = approverStats[approverId].approved;
                approverStats[approverId].averageTimeHours = ((currentAvg * (count - 1)) + timeHours) / count;
              }
            } else if (approval.status === ApprovalStatus.rejected) {
              approverStats[approverId].rejected++;
            } else {
              approverStats[approverId].pending++;
            }
          });

          // Find top approver
          const topApprover = Object.entries(approverStats)
            .sort((a, b) => b[1].totalApprovals - a[1].totalApprovals)[0];

          // Analyze department statistics (from PEOPLE columns or department fields)
          const departmentStats: Record<string, number> = {};
          const assigneeStats: Record<string, number> = {};

          teamItems.forEach(item => {
            // Find department cell
            const deptCell = item.cells.find(c =>
              c.column.name.toLowerCase().includes('department') ||
              c.column.name.toLowerCase().includes('dept')
            );
            
            if (deptCell && deptCell.value) {
              const dept = String(deptCell.value);
              departmentStats[dept] = (departmentStats[dept] || 0) + 1;
            }

            // Find PEOPLE columns (assignees)
            item.cells.forEach(cell => {
              if (cell.column.type === 'PEOPLE' && cell.value) {
                if (Array.isArray(cell.value)) {
                  cell.value.forEach((userId: unknown) => {
                    const userIdStr = String(userId);
                    assigneeStats[userIdStr] = (assigneeStats[userIdStr] || 0) + 1;
                  });
                } else {
                  assigneeStats[String(cell.value)] = (assigneeStats[String(cell.value)] || 0) + 1;
                }
              }
            });
          });

          // Get user names for assignees
          const assigneeUserIds = Object.keys(assigneeStats);
          const assigneeNames: Record<string, string> = {};
          if (assigneeUserIds.length > 0) {
            const users = await prisma.user.findMany({
              where: {
                id: { in: assigneeUserIds.slice(0, 50) }, // Limit to avoid too many queries
              },
              select: {
                id: true,
                name: true,
                email: true,
              },
            });
            users.forEach(user => {
              assigneeNames[user.id] = user.name || user.email;
            });
          }

          // Find top department and top assignee
          const topDepartment = Object.entries(departmentStats)
            .sort((a, b) => b[1] - a[1])[0];
          const topAssignee = Object.entries(assigneeStats)
            .sort((a, b) => b[1] - a[1])[0];

          // Build metrics
          const teamMetrics: Array<{ label: string; value: string | number }> = [
            { label: 'Total Approvals', value: approvals.length },
            { label: 'Active Approvers', value: Object.keys(approverStats).length },
            { label: 'Total Items', value: teamItems.length },
            { label: 'Active Assignees', value: Object.keys(assigneeStats).length },
          ];

          if (Object.keys(departmentStats).length > 0) {
            teamMetrics.push({ label: 'Departments', value: Object.keys(departmentStats).length });
          }

          // Build insights
          const teamInsights: string[] = [];

          if (topApprover) {
            const approver = approvals.find(a => a.approver?.id === topApprover[0])?.approver;
            const stats = topApprover[1];
            teamInsights.push(
              `Top approver: ${approver?.name || approver?.email || 'Unknown'} with ${stats.totalApprovals} approvals (${stats.approved} approved, ${stats.rejected} rejected)`
            );
            if (stats.approved > 0 && stats.averageTimeHours > 0) {
              teamInsights.push(`Average approval time: ${(stats.averageTimeHours / 24).toFixed(1)} days`);
            }
          }

          if (topDepartment) {
            teamInsights.push(`Top department: ${topDepartment[0]} with ${topDepartment[1]} items`);
          }

          if (topAssignee) {
            const assigneeName = assigneeNames[topAssignee[0]] || topAssignee[0];
            teamInsights.push(`Most assigned: ${assigneeName} with ${topAssignee[1]} assignments`);
          }

          // Calculate approval rate
          const totalCompleted = approvals.filter(a => 
            a.status === ApprovalStatus.approved || a.status === ApprovalStatus.rejected
          ).length;
          if (totalCompleted > 0) {
            const approvalRate = (approvals.filter(a => a.status === ApprovalStatus.approved).length / totalCompleted) * 100;
            teamInsights.push(`Overall approval rate: ${approvalRate.toFixed(1)}%`);
          }

          // Generate AI summary
          let teamAiSummary = '';
          if (OPENAI_API_KEY) {
            try {
              const summaryPrompt = `Provide team insights for the ${timeframe || 'last month'}:

${topApprover ? `Top Approver: ${approvals.find(a => a.approver?.id === topApprover[0])?.approver?.name} (${topApprover[1].totalApprovals} approvals)` : ''}
${topDepartment ? `Top Department: ${topDepartment[0]} (${topDepartment[1]} items)` : ''}
${topAssignee ? `Most Assigned: ${assigneeNames[topAssignee[0]] || topAssignee[0]} (${topAssignee[1]} assignments)` : ''}
Total Approvals: ${approvals.length}
Total Items: ${teamItems.length}

Provide 2-3 sentences highlighting key team performance insights.`;
              
              teamAiSummary = await callOpenAI(
                summaryPrompt,
                'You are a team performance analyst. Provide actionable insights about team productivity and patterns.',
                150
              );
            } catch (error) {
              console.error('Error generating AI team summary:', error);
            }
          }

          const teamSummary = teamAiSummary || `Team insights for the ${timeframe || 'last month'}: 
${topApprover ? `${approvals.find(a => a.approver?.id === topApprover[0])?.approver?.name} has the most approvals. ` : ''}
${topDepartment ? `${topDepartment[0]} department has the most items. ` : ''}
${topAssignee ? `${assigneeNames[topAssignee[0]] || topAssignee[0]} has the most assignments.` : ''}`;

          return {
            summary: teamSummary,
            metrics: teamMetrics,
            insights: teamInsights,
          };
        }

        case 'trends': {
          // Enhanced trend analysis
          const trendItems = await prisma.item.findMany({
            where: {
              ...(workspaceId ? {
                board: {
                  workspaceId,
                },
              } : {}),
              ...(boardId ? { boardId } : {}),
              deletedAt: null,
              createdAt: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
            },
            orderBy: { createdAt: 'asc' },
          });

          // Calculate trends by week
          const weekGroups: Record<string, number> = {};
          trendItems.forEach(item => {
            const weekStart = new Date(item.createdAt);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            weekStart.setHours(0, 0, 0, 0);
            const weekKey = weekStart.toISOString().split('T')[0];
            weekGroups[weekKey] = (weekGroups[weekKey] || 0) + 1;
          });

          const trendData = Object.entries(weekGroups)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-4); // Last 4 weeks

          const trendAnalysis: Array<{ label: string; description: string; direction: 'up' | 'down' | 'stable' }> = [];

          if (trendData.length >= 2) {
            const recent = trendData[trendData.length - 1][1];
            const previous = trendData[trendData.length - 2][1];
            const change = ((recent - previous) / previous) * 100;

            trendAnalysis.push({
              label: 'Item Creation Trend',
              description: change > 10 
                ? `Increasing by ${change.toFixed(1)}%` 
                : change < -10 
                ? `Decreasing by ${Math.abs(change).toFixed(1)}%` 
                : 'Stable',
              direction: change > 10 ? 'up' : change < -10 ? 'down' : 'stable',
            });
          }

          return {
            summary: `Trend analysis for the ${timeframe || 'last month'}: ${trendItems.length} items created.`,
            trends: trendAnalysis,
          };
        }

        default:
          return {
            summary: 'Insights not available.',
          };
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      return {
        summary: 'Unable to generate insights at this time.',
      };
    }
  }

  /**
   * Auto-tagging: Auto-tag invoices by content, auto-categorize by amount, smart grouping suggestions
   */
  static async autoTagging(request: AutoTaggingRequest): Promise<AutoTaggingResponse> {
    const { itemId, boardId, context } = request;

    try {
      // Fetch item data if itemId provided
      let itemData: any = null;
      if (itemId) {
        itemData = await prisma.item.findUnique({
          where: { id: itemId },
          include: {
            cells: {
              include: {
                column: true,
              },
            },
            board: {
              include: {
                columns: true,
              },
            },
          },
        });
      }

      // Extract context data
      const itemName = context?.itemName || itemData?.name || '';
      const description = context?.description || '';
      const lineItems = context?.lineItems || [];
      const amount = context?.amount || 0;
      const existingTags = context?.existingTags || [];
      const existingCategory = context?.existingCategory || '';

      // Build content for analysis
      const contentText = [
        itemName,
        description,
        ...lineItems.map(li => `${li.name || li.description || ''} ${li.quantity || 0} ${li.price || li.unitPrice || 0}`),
      ].filter(Boolean).join(' ');

      // Analyze content for tags
      const tags: string[] = [];
      const tagSuggestions: Array<{ tag: string; reason: string; confidence: number }> = [];

      // Content-based tagging using keywords
      const contentKeywords: Record<string, string[]> = {
        'urgent': ['urgent', 'asap', 'immediate', 'rush', 'priority'],
        'payment': ['payment', 'invoice', 'billing', 'charge', 'fee'],
        'service': ['service', 'consulting', 'support', 'maintenance', 'repair'],
        'product': ['product', 'item', 'goods', 'merchandise', 'delivery'],
        'recurring': ['recurring', 'subscription', 'monthly', 'annual', 'regular'],
        'one-time': ['one-time', 'single', 'project', 'one-off'],
        'high-value': ['large', 'major', 'significant', 'important'],
        'low-value': ['small', 'minor', 'basic'],
      };

      const lowerContent = contentText.toLowerCase();
      for (const [tag, keywords] of Object.entries(contentKeywords)) {
        const matches = keywords.filter(kw => lowerContent.includes(kw)).length;
        if (matches > 0) {
          const confidence = Math.min(0.9, 0.5 + (matches * 0.1));
          tags.push(tag);
          tagSuggestions.push({
            tag,
            reason: `Content contains keywords: ${keywords.filter(kw => lowerContent.includes(kw)).join(', ')}`,
            confidence,
          });
        }
      }

      // Amount-based categorization
      let category: string | undefined = existingCategory;
      if (!category && amount > 0) {
        if (amount >= 50000) {
          category = 'High Value';
        } else if (amount >= 10000) {
          category = 'Medium-High Value';
        } else if (amount >= 5000) {
          category = 'Medium Value';
        } else if (amount >= 1000) {
          category = 'Low-Medium Value';
        } else {
          category = 'Low Value';
        }
      }

      // Use AI to suggest additional tags if OpenAI is available
      let aiTags: string[] = [];
      if (OPENAI_API_KEY && contentText) {
        try {
          const tagPrompt = `Analyze this invoice content and suggest relevant tags (return only comma-separated tags, no explanation):
"${contentText.substring(0, 500)}"

Amount: ${amount}
Existing tags: ${existingTags.join(', ') || 'None'}

Return only 3-5 relevant tags, comma-separated:`;

          const aiResponse = await callOpenAI(tagPrompt, 'You are a tagging assistant. Return only comma-separated tags.', 50);
          aiTags = aiResponse.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
          aiTags.forEach(tag => {
            if (!tags.includes(tag)) {
              tags.push(tag);
              tagSuggestions.push({
                tag,
                reason: 'AI-suggested based on content analysis',
                confidence: 0.75,
              });
            }
          });
        } catch (error) {
          console.error('Error generating AI tags:', error);
        }
      }

      // Smart grouping suggestions
      const groupingSuggestions: Array<{ groupName: string; items: string[]; reason: string }> = [];

      if (boardId) {
        try {
          // Find similar items for grouping
          const similarItems = await prisma.item.findMany({
            where: {
              boardId,
              ...(itemId ? { id: { not: itemId } } : {}),
            },
            include: {
              cells: {
                include: {
                  column: true,
                },
              },
            },
            take: 10,
          });

          // Group by similar categories
          if (category) {
            const categoryGroup: string[] = [];
            similarItems.forEach(item => {
              const itemCategory = item.cells.find(c =>
                c.column.name.toLowerCase().includes('category') ||
                c.column.type === 'DROPDOWN'
              )?.value;
              if (String(itemCategory).toLowerCase() === category.toLowerCase()) {
                categoryGroup.push(item.name);
              }
            });
            if (categoryGroup.length > 0) {
              groupingSuggestions.push({
                groupName: `${category} Items`,
                items: categoryGroup,
                reason: `Items with same category: ${category}`,
              });
            }
          }

          // Group by amount range
          const amountRange = amount >= 50000 ? 'high' : amount >= 10000 ? 'medium-high' : amount >= 5000 ? 'medium' : 'low';
          const amountGroup: string[] = [];
          similarItems.forEach(item => {
            const itemAmountCell = item.cells.find(c =>
              c.column.type === 'CURRENCY' || c.column.type === 'NUMBER' ||
              c.column.name.toLowerCase().includes('amount') ||
              c.column.name.toLowerCase().includes('total')
            );
            if (itemAmountCell?.value) {
              const itemAmount = typeof itemAmountCell.value === 'number'
                ? itemAmountCell.value
                : parseFloat(String(itemAmountCell.value)) || 0;
              const itemRange = itemAmount >= 50000 ? 'high' : itemAmount >= 10000 ? 'medium-high' : itemAmount >= 5000 ? 'medium' : 'low';
              if (itemRange === amountRange) {
                amountGroup.push(item.name);
              }
            }
          });
          if (amountGroup.length > 0) {
            groupingSuggestions.push({
              groupName: `${amountRange.charAt(0).toUpperCase() + amountRange.slice(1)} Value Items`,
              items: amountGroup,
              reason: `Items in similar amount range: ${amountRange}`,
            });
          }
        } catch (error) {
          console.error('Error generating grouping suggestions:', error);
        }
      }

      return {
        tags: [...new Set(tags)], // Remove duplicates
        category,
        confidence: tags.length > 0 ? 0.8 : 0.5,
        suggestions: tagSuggestions,
        groupingSuggestions: groupingSuggestions.length > 0 ? groupingSuggestions : undefined,
      };
    } catch (error) {
      console.error('Error in auto-tagging:', error);
      return {
        tags: [],
        confidence: 0,
      };
    }
  }

  /**
   * Formula Suggestions: Suggest formulas for totals, auto-calculate tax suggestions, formula validation
   */
  static async suggestFormulas(request: FormulaSuggestionRequest): Promise<FormulaSuggestionResponse> {
    const { itemId, boardId, context, type } = request;

    try {
      const suggestions: Array<{
        name: string;
        formula: string;
        description: string;
        targetColumn?: string;
        confidence: number;
        validation?: {
          isValid: boolean;
          errors?: string[];
          preview?: number;
        };
      }> = [];

      const taxSuggestions: Array<{
        rate: number;
        type: 'percentage' | 'flat';
        description: string;
        calculatedAmount?: number;
        basedOn?: string;
      }> = [];

      // Get board columns to understand available fields
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
          columns: {
            orderBy: { position: 'asc' },
          },
        },
      });

      if (!board || !board.columns) {
        throw new Error('Board not found');
      }

      // Get item data if available
      let itemData: any = null;
      if (itemId) {
        itemData = await prisma.item.findUnique({
          where: { id: itemId },
          include: {
            cells: {
              include: {
                column: true,
              },
            },
          },
        });
      }

      // Build field map for formula references
      const fieldMap: Record<string, unknown> = {};
      if (itemData) {
        itemData.cells.forEach((cell: any) => {
          fieldMap[cell.columnId] = cell.value;
          fieldMap[cell.column.name.toLowerCase().replace(/\s+/g, '_')] = cell.value;
        });
      }

      // Extract context
      const lineItems = context?.lineItems || [];
      const subtotal = context?.subtotal || 0;
      const amount = context?.amount || 0;
      const taxRate = context?.taxRate;
      const discount = context?.discount || 0;

      // Calculate subtotal from line items if not provided
      const calculatedSubtotal = subtotal || lineItems.reduce((sum, li) => {
        const qty = li.quantity || 0;
        const price = li.price || li.unitPrice || 0;
        return sum + (qty * price);
      }, 0);

      // Suggest formulas based on type
      const suggestionType = type || 'total';

      switch (suggestionType) {
        case 'subtotal':
          suggestions.push({
            name: 'Subtotal from Line Items',
            formula: '{quantity_1} * {price_1} + {quantity_2} * {price_2}',
            description: 'Calculate subtotal by summing quantity × price for each line item',
            confidence: 0.9,
            validation: {
              isValid: true,
              preview: calculatedSubtotal,
            },
          });
          break;

        case 'tax':
          // Common tax rates
          const commonTaxRates = [5, 10, 13, 18, 20, 25];
          commonTaxRates.forEach(rate => {
            const taxAmount = (calculatedSubtotal * rate) / 100;
            taxSuggestions.push({
              rate,
              type: 'percentage',
              description: `${rate}% tax rate (common standard rate)`,
              calculatedAmount: Math.round(taxAmount * 100) / 100,
              basedOn: `Subtotal: ${calculatedSubtotal}`,
            });
          });

          // Find tax column
          const taxColumn = board.columns.find((c: { name: string; type: string }) =>
            c.name.toLowerCase().includes('tax') ||
            c.type === 'PERCENTAGE'
          );

          if (taxColumn) {
            suggestions.push({
              name: 'Tax Calculation',
              formula: `{subtotal} * ({tax_rate} / 100)`,
              description: 'Calculate tax as percentage of subtotal',
              targetColumn: taxColumn.id,
              confidence: 0.95,
              validation: {
                isValid: true,
                preview: taxRate ? (calculatedSubtotal * taxRate) / 100 : undefined,
              },
            });
          }
          break;

        case 'discount':
          suggestions.push({
            name: 'Discount Calculation (Percentage)',
            formula: `{subtotal} * ({discount_percent} / 100)`,
            description: 'Calculate discount as percentage of subtotal',
            confidence: 0.9,
            validation: {
              isValid: true,
              preview: discount || undefined,
            },
          });
          suggestions.push({
            name: 'Discount Calculation (Flat)',
            formula: '{discount_amount}',
            description: 'Apply flat discount amount',
            confidence: 0.85,
            validation: {
              isValid: true,
              preview: discount || undefined,
            },
          });
          break;

        case 'total':
          // Total formula
          suggestions.push({
            name: 'Total with Tax',
            formula: '{subtotal} + {tax}',
            description: 'Calculate total: subtotal + tax',
            confidence: 0.95,
            validation: {
              isValid: true,
              preview: calculatedSubtotal + (taxRate ? (calculatedSubtotal * taxRate) / 100 : 0),
            },
          });

          suggestions.push({
            name: 'Total with Tax and Discount',
            formula: '{subtotal} + {tax} - {discount}',
            description: 'Calculate total: subtotal + tax - discount',
            confidence: 0.9,
            validation: {
              isValid: true,
              preview: calculatedSubtotal + (taxRate ? (calculatedSubtotal * taxRate) / 100 : 0) - discount,
            },
          });

          // Find total column
          const totalColumn = board.columns.find((c: { name: string; type: string }) =>
            c.name.toLowerCase().includes('total') ||
            c.name.toLowerCase().includes('amount')
          );

          if (totalColumn) {
            suggestions.push({
              name: 'Grand Total',
              formula: `{subtotal} + {tax} - {discount}`,
              description: 'Grand total calculation including all adjustments',
              targetColumn: totalColumn.id,
              confidence: 0.95,
              validation: {
                isValid: true,
                preview: amount || (calculatedSubtotal + (taxRate ? (calculatedSubtotal * taxRate) / 100 : 0) - discount),
              },
            });
          }
          break;

        case 'custom':
          // Suggest custom formulas based on existing columns
          const numberColumns = board.columns.filter((c: { type: string }) =>
            c.type === 'NUMBER' || c.type === 'CURRENCY' || c.type === 'PERCENTAGE'
          );

          if (numberColumns.length >= 2) {
            const col1 = numberColumns[0];
            const col2 = numberColumns[1];
            suggestions.push({
              name: `Sum of ${col1.name} and ${col2.name}`,
              formula: `{${col1.name.toLowerCase().replace(/\s+/g, '_')}} + {${col2.name.toLowerCase().replace(/\s+/g, '_')}}`,
              description: `Add values from ${col1.name} and ${col2.name}`,
              confidence: 0.8,
              validation: {
                isValid: true,
              },
            });
          }
          break;
      }

      // Validate formulas
      suggestions.forEach(suggestion => {
        try {
          // Simple validation: check if formula contains valid field references
          const fieldRefs = suggestion.formula.match(/\{([^}]+)\}/g) || [];
          const hasInvalidRefs = fieldRefs.some(ref => {
            const fieldName = ref.replace(/[{}]/g, '');
            return !fieldMap[fieldName] && !board.columns.some((c: { name: string }) =>
              c.name.toLowerCase().replace(/\s+/g, '_') === fieldName.toLowerCase()
            );
          });

          if (!suggestion.validation) {
            suggestion.validation = {
              isValid: !hasInvalidRefs,
              errors: hasInvalidRefs ? ['Formula contains invalid field references'] : undefined,
            };
          } else {
            suggestion.validation.isValid = !hasInvalidRefs;
            if (hasInvalidRefs) {
              suggestion.validation.errors = ['Formula contains invalid field references'];
            }
          }

          // Try to calculate preview if possible
          if (suggestion.validation.isValid && !suggestion.validation.preview) {
            try {
              let formula = suggestion.formula;
              Object.entries(fieldMap).forEach(([key, value]) => {
                const regex = new RegExp(`\\{${key}\\}`, 'gi');
                formula = formula.replace(regex, String(value || 0));
              });
              // Basic evaluation (in production, use a safer parser)
              const result = eval(`(${formula})`);
              if (typeof result === 'number' && !isNaN(result)) {
                suggestion.validation.preview = Math.round(result * 100) / 100;
              }
            } catch (error) {
              // Preview calculation failed, but formula might still be valid
            }
          }
        } catch (error) {
          if (!suggestion.validation) {
            suggestion.validation = {
              isValid: false,
              errors: ['Validation error'],
            };
          }
        }
      });

      return {
        suggestions,
        taxSuggestions: taxSuggestions.length > 0 ? taxSuggestions : undefined,
      };
    } catch (error) {
      console.error('Error suggesting formulas:', error);
      return {
        suggestions: [],
      };
    }
  }

  /**
   * Email Draft: Generate email to client with professional tone and invoice details
   */
  static async generateEmailDraft(request: EmailDraftRequest): Promise<EmailDraftResponse> {
    const { itemId, type, context } = request;

    try {
      // Fetch item data if itemId provided
      let itemData: any = null;
      if (itemId) {
        itemData = await prisma.item.findUnique({
          where: { id: itemId },
          include: {
            cells: {
              include: {
                column: true,
              },
            },
            board: true,
          },
        });
      }

      // Extract context
      const emailType = type || 'invoice';
      const recipientName = context?.recipientName || 'Client';
      const recipientEmail = context?.recipientEmail || '';
      const itemName = context?.itemName || itemData?.name || 'Invoice';
      const amount = context?.amount || 0;
      const dueDate = context?.dueDate || '';
      const invoiceNumber = context?.invoiceNumber || itemName;
      const lineItems = context?.lineItems || [];
      const status = context?.status || itemData?.status || '';
      const notes = context?.notes || '';
      const tone = context?.tone || 'professional';

      // Build invoice details
      const invoiceDetails: string[] = [];
      if (invoiceNumber) {
        invoiceDetails.push(`Invoice Number: ${invoiceNumber}`);
      }
      if (amount > 0) {
        invoiceDetails.push(`Amount: $${amount.toLocaleString()}`);
      }
      if (dueDate) {
        const dueDateFormatted = new Date(dueDate).toLocaleDateString();
        invoiceDetails.push(`Due Date: ${dueDateFormatted}`);
      }
      if (lineItems.length > 0) {
        invoiceDetails.push(`\nLine Items:`);
        lineItems.forEach((li, idx) => {
          const qty = li.quantity || 0;
          const price = li.price || li.unitPrice || 0;
          const total = qty * price;
          invoiceDetails.push(`${idx + 1}. ${li.name || li.description || 'Item'}: ${qty} × $${price.toLocaleString()} = $${total.toLocaleString()}`);
        });
      }

      // Generate email based on type
      let subject = '';
      let body = '';
      let includesInvoiceDetails = false;

      if (OPENAI_API_KEY) {
        try {
          // Use AI for professional email generation
          const emailPrompt = `Generate a ${tone} ${emailType} email with the following details:

Recipient: ${recipientName}${recipientEmail ? ` (${recipientEmail})` : ''}
${invoiceDetails.length > 0 ? `\nInvoice Details:\n${invoiceDetails.join('\n')}` : ''}
${notes ? `\nAdditional Notes: ${notes}` : ''}
${status ? `\nStatus: ${status}` : ''}

Email Type: ${emailType}
Tone: ${tone}

${emailType === 'invoice' ? 'Generate a professional invoice email requesting payment.' : ''}
${emailType === 'reminder' ? 'Generate a polite payment reminder email.' : ''}
${emailType === 'payment_confirmation' ? 'Generate a payment confirmation email thanking the client.' : ''}

Return the email in this format:
SUBJECT: [subject line]
BODY: [email body]

Make it professional, clear, and include all invoice details.`;

          const aiResponse = await callOpenAI(emailPrompt, 'You are a professional business communication assistant. Write clear, professional emails.', 800);
          
          // Parse AI response
          const subjectMatch = aiResponse.match(/SUBJECT:\s*(.+?)(?:\n|BODY:)/i);
          const bodyMatch = aiResponse.match(/BODY:\s*(.+)/is);

          if (subjectMatch && bodyMatch) {
            subject = subjectMatch[1].trim();
            body = bodyMatch[1].trim();
            includesInvoiceDetails = invoiceDetails.length > 0;
          } else {
            // Fallback: use full response as body
            body = aiResponse;
            subject = emailType === 'invoice' ? `Invoice ${invoiceNumber || itemName}` : emailType === 'reminder' ? `Payment Reminder: ${invoiceNumber || itemName}` : `Payment Confirmation: ${invoiceNumber || itemName}`;
            includesInvoiceDetails = invoiceDetails.length > 0;
          }
        } catch (error) {
          console.error('Error generating AI email:', error);
          // Fallback to template
        }
      }

      // Fallback template if AI not available or failed
      if (!body) {
        includesInvoiceDetails = invoiceDetails.length > 0;

        switch (emailType) {
          case 'invoice':
            subject = `Invoice ${invoiceNumber || itemName}`;
            body = `Dear ${recipientName},\n\n`;
            body += `We hope this email finds you well. Please find attached invoice details below:\n\n`;
            if (invoiceDetails.length > 0) {
              body += invoiceDetails.join('\n') + '\n\n';
            }
            if (dueDate) {
              body += `Payment is due by ${new Date(dueDate).toLocaleDateString()}. `;
            }
            body += `Please remit payment at your earliest convenience.\n\n`;
            body += `If you have any questions or concerns, please don't hesitate to contact us.\n\n`;
            body += `Best regards,\nYour Team`;
            break;

          case 'reminder':
            subject = `Payment Reminder: ${invoiceNumber || itemName}`;
            body = `Dear ${recipientName},\n\n`;
            body += `This is a friendly reminder that payment for the following invoice is ${dueDate && new Date(dueDate) < new Date() ? 'overdue' : 'due soon'}:\n\n`;
            if (invoiceDetails.length > 0) {
              body += invoiceDetails.join('\n') + '\n\n';
            }
            body += `Please submit payment as soon as possible to avoid any late fees.\n\n`;
            body += `Thank you for your prompt attention to this matter.\n\n`;
            body += `Best regards,\nYour Team`;
            break;

          case 'payment_confirmation':
            subject = `Payment Confirmation: ${invoiceNumber || itemName}`;
            body = `Dear ${recipientName},\n\n`;
            body += `Thank you for your payment. We have received payment for the following invoice:\n\n`;
            if (invoiceDetails.length > 0) {
              body += invoiceDetails.join('\n') + '\n\n';
            }
            body += `We appreciate your business and look forward to serving you in the future.\n\n`;
            body += `Best regards,\nYour Team`;
            break;

          default:
            subject = `Regarding: ${invoiceNumber || itemName}`;
            body = `Dear ${recipientName},\n\n`;
            body += `We are writing to you regarding ${itemName}.\n\n`;
            if (invoiceDetails.length > 0) {
              body += invoiceDetails.join('\n') + '\n\n';
            }
            if (notes) {
              body += `Additional Notes: ${notes}\n\n`;
            }
            body += `Best regards,\nYour Team`;
        }
      }

      return {
        subject,
        body,
        tone,
        includesInvoiceDetails,
        suggestions: [
          'Review and customize the email before sending',
          'Ensure all invoice details are accurate',
          'Add your company signature if needed',
        ],
      };
    } catch (error) {
      console.error('Error generating email draft:', error);
      return {
        subject: 'Invoice Notification',
        body: 'Dear Client,\n\nPlease find attached invoice details.\n\nBest regards,\nYour Team',
        tone: 'professional',
        includesInvoiceDetails: false,
      };
    }
  }
}


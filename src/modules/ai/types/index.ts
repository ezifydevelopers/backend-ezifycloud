export interface TextGenerationRequest {
  type: 'description' | 'comment' | 'email' | 'summary';
  context?: {
    itemName?: string;
    itemData?: Record<string, unknown>;
    columnValues?: Record<string, unknown>;
    existingText?: string;
    lineItems?: Array<{ 
      name?: string;
      description?: string;
      quantity?: number; 
      price?: number;
      unitPrice?: number;
    }>;
    category?: string;
    recipientEmail?: string;
    recipientName?: string;
    tone?: 'professional' | 'friendly' | 'formal' | 'casual';
    previousComments?: Array<{ 
      content: string; 
      author?: string;
      user?: { name: string; email?: string };
    }>;
    mode?: 'generate' | 'suggest' | 'improve' | 'reply' | 'summarize'; // For description and comment modes
  };
}

export interface SmartSearchRequest {
  query: string;
  boardId?: string;
  workspaceId?: string;
  limit?: number;
  filters?: Record<string, unknown>;
}

export interface PredictionRequest {
  type: 'payment_delay' | 'approval_time' | 'risk_score';
  itemId?: string;
  itemData?: {
    amount?: number;
    clientId?: string;
    status?: string;
    createdDate?: string;
    dueDate?: string;
    history?: Array<Record<string, unknown>>;
  };
}

export interface InsightRequest {
  type: 'board_summary' | 'team_insights' | 'trends';
  boardId?: string;
  workspaceId?: string;
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
}

export interface AIGenerationResponse {
  text: string;
  suggestions?: string[];
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface SmartSearchResponse {
  results: Array<{
    itemId: string;
    itemName: string;
    relevanceScore: number;
    matchedFields: string[];
    snippet?: string;
  }>;
  queryInterpretation?: string;
  suggestedFilters?: Record<string, unknown>;
}

export interface PredictionResponse {
  prediction: number | string;
  confidence: number;
  factors?: Array<{ factor: string; impact: number }>;
  recommendation?: string;
  riskScore?: number; // 0-100 risk score for payment delay predictions
}

export interface InsightResponse {
  summary: string;
  metrics?: Array<{ label: string; value: string | number }>;
  trends?: Array<{ label: string; description: string; direction: 'up' | 'down' | 'stable' }>;
  insights?: string[];
}

export interface AutoTaggingRequest {
  itemId: string;
  boardId?: string;
  context?: {
    itemName?: string;
    description?: string;
    lineItems?: Array<{
      name?: string;
      description?: string;
      quantity?: number;
      price?: number;
      unitPrice?: number;
    }>;
    amount?: number;
    existingTags?: string[];
    existingCategory?: string;
  };
}

export interface AutoTaggingResponse {
  tags: string[];
  category?: string;
  confidence: number;
  suggestions?: Array<{
    tag: string;
    reason: string;
    confidence: number;
  }>;
  groupingSuggestions?: Array<{
    groupName: string;
    items: string[];
    reason: string;
  }>;
}

export interface FormulaSuggestionRequest {
  itemId?: string;
  boardId: string;
  context?: {
    lineItems?: Array<{
      quantity?: number;
      price?: number;
      unitPrice?: number;
      tax?: number;
    }>;
    subtotal?: number;
    amount?: number;
    taxRate?: number;
    discount?: number;
    existingFormulas?: Record<string, string>;
  };
  type?: 'total' | 'tax' | 'discount' | 'subtotal' | 'custom';
}

export interface FormulaSuggestionResponse {
  suggestions: Array<{
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
  }>;
  taxSuggestions?: Array<{
    rate: number;
    type: 'percentage' | 'flat';
    description: string;
    calculatedAmount?: number;
    basedOn?: string;
  }>;
}

export interface EmailDraftRequest {
  itemId?: string;
  type?: 'invoice' | 'reminder' | 'payment_confirmation' | 'general';
  context?: {
    itemName?: string;
    recipientName?: string;
    recipientEmail?: string;
    amount?: number;
    dueDate?: string;
    invoiceNumber?: string;
    lineItems?: Array<{
      name?: string;
      description?: string;
      quantity?: number;
      price?: number;
      unitPrice?: number;
    }>;
    status?: string;
    notes?: string;
    tone?: 'professional' | 'friendly' | 'formal' | 'casual';
  };
}

export interface EmailDraftResponse {
  subject: string;
  body: string;
  tone: 'professional' | 'friendly' | 'formal' | 'casual';
  includesInvoiceDetails: boolean;
  suggestions?: string[];
}


// Invoice calculation service - Calculate subtotal, tax, discount, and total

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax?: number;
  total: number;
}

export interface InvoiceCalculationConfig {
  taxType: 'percentage' | 'flat';
  taxValue: number;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  currency: string;
  baseCurrency?: string;
  exchangeRate?: number;
}

export interface InvoiceCalculationResult {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
}

/**
 * Calculate invoice subtotal from line items
 */
export function calculateSubtotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    return sum + (quantity * unitPrice);
  }, 0);
}

/**
 * Calculate tax amount
 */
export function calculateTax(
  subtotal: number,
  config: InvoiceCalculationConfig
): number {
  if (!config.taxValue || config.taxValue <= 0) {
    return 0;
  }

  if (config.taxType === 'percentage') {
    return (subtotal * config.taxValue) / 100;
  } else {
    return config.taxValue;
  }
}

/**
 * Calculate discount amount
 */
export function calculateDiscount(
  subtotal: number,
  config: InvoiceCalculationConfig
): number {
  if (!config.discountValue || config.discountValue <= 0) {
    return 0;
  }

  if (config.discountType === 'percentage') {
    return (subtotal * config.discountValue) / 100;
  } else {
    return config.discountValue;
  }
}

/**
 * Apply currency conversion
 */
export function convertCurrency(
  amount: number,
  config: InvoiceCalculationConfig
): number {
  if (config.baseCurrency && config.exchangeRate && config.baseCurrency !== config.currency) {
    return amount * config.exchangeRate;
  }
  return amount;
}

/**
 * Calculate total invoice amount
 */
export function calculateInvoiceTotal(
  lineItems: LineItem[],
  config: InvoiceCalculationConfig
): InvoiceCalculationResult {
  // Calculate subtotal
  let subtotal = calculateSubtotal(lineItems);

  // Apply currency conversion if needed
  if (config.baseCurrency && config.exchangeRate && config.baseCurrency !== config.currency) {
    subtotal = convertCurrency(subtotal, config);
  }

  // Calculate tax
  const tax = calculateTax(subtotal, config);

  // Calculate discount (applied to subtotal before tax)
  const discount = calculateDiscount(subtotal, config);

  // Calculate total: subtotal + tax - discount
  const total = subtotal + tax - discount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: config.currency,
  };
}

/**
 * Get currency exchange rate (mock - in production, use real API)
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // Mock exchange rates (in production, use a real API like exchangerate-api.com)
  const rates: Record<string, Record<string, number>> = {
    USD: {
      EUR: 0.85,
      GBP: 0.73,
      INR: 83.0,
      JPY: 150.0,
      CNY: 7.2,
      AED: 3.67,
    },
    EUR: {
      USD: 1.18,
      GBP: 0.86,
      INR: 97.6,
    },
    GBP: {
      USD: 1.37,
      EUR: 1.16,
      INR: 113.5,
    },
    INR: {
      USD: 0.012,
      EUR: 0.0102,
      GBP: 0.0088,
    },
  };

  if (fromCurrency === toCurrency) {
    return 1;
  }

  // Direct rate
  if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
    return rates[fromCurrency][toCurrency];
  }

  // Reverse rate
  if (rates[toCurrency] && rates[toCurrency][fromCurrency]) {
    return 1 / rates[toCurrency][fromCurrency];
  }

  // Default to 1 if rate not found
  return 1;
}


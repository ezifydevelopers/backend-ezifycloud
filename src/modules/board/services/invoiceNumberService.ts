// Invoice numbering service - Generate formatted invoice numbers

import prisma from '../../../lib/prisma';

interface InvoiceNumberSettings {
  format?: string;
  prefix?: string;
  suffix?: string;
  startNumber?: number;
  numberPadding?: number;
  resetOn?: 'never' | 'month' | 'year';
  lastCounter?: number;
  lastResetDate?: string;
}

/**
 * Generate the next invoice number based on column settings
 */
export async function generateInvoiceNumber(
  columnId: string
): Promise<string> {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
  });

  if (!column || column.type !== 'AUTO_NUMBER') {
    throw new Error('Column is not an AUTO_NUMBER type');
  }

  const settings = (column.settings as InvoiceNumberSettings) || {};
  const {
    format = '{number}',
    prefix = '',
    suffix = '',
    startNumber = 1,
    numberPadding = 0,
    resetOn = 'never',
    lastCounter = 0,
    lastResetDate,
  } = settings;

  // Determine if counter should reset
  const shouldReset = checkResetCounter(resetOn, lastResetDate);
  
  // Get current counter value
  let currentCounter = shouldReset ? startNumber : Math.max(startNumber, lastCounter + 1);

  // If no last counter, find the highest existing number
  if (!lastCounter && !shouldReset) {
    const existingCells = await prisma.cell.findMany({
      where: {
        columnId: column.id,
        item: {
          deletedAt: null,
        },
      },
    });

    let maxNumber = 0;
    existingCells.forEach((cell) => {
      // Extract numeric part from formatted strings
      const cellValue = extractNumberFromValue(cell.value, format, prefix, suffix);
      if (cellValue > maxNumber) {
        maxNumber = cellValue;
      }
    });

    currentCounter = Math.max(startNumber, maxNumber + 1);
  }

  // Apply padding
  const paddedNumber = numberPadding > 0
    ? String(currentCounter).padStart(numberPadding, '0')
    : String(currentCounter);

  // Build formatted number
  const now = new Date();
  let formattedNumber = format
    .replace(/{prefix}/g, prefix || '')
    .replace(/{number}/g, paddedNumber)
    .replace(/{suffix}/g, suffix || '')
    .replace(/{date:YYYY}/g, now.getFullYear().toString())
    .replace(/{date:MM}/g, String(now.getMonth() + 1).padStart(2, '0'))
    .replace(/{date:DD}/g, String(now.getDate()).padStart(2, '0'))
    .replace(/{date:YY}/g, String(now.getFullYear()).slice(-2));

  // Update column settings with new counter
  await prisma.column.update({
    where: { id: columnId },
    data: {
      settings: {
        ...settings,
        lastCounter: currentCounter,
        lastResetDate: shouldReset ? now.toISOString().split('T')[0] : lastResetDate,
      } as any,
    },
  });

  return formattedNumber;
}

/**
 * Extract numeric value from a formatted invoice number
 */
function extractNumberFromValue(
  value: unknown,
  format: string,
  prefix: string,
  suffix: string
): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Try to extract number from formatted string
    // Remove prefix and suffix
    let numberStr = value;
    if (prefix) {
      numberStr = numberStr.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), '');
    }
    if (suffix) {
      numberStr = numberStr.replace(new RegExp(`${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
    }

    // Extract numeric part (remove date placeholders)
    numberStr = numberStr.replace(/^\d{4}-/, ''); // Remove YYYY-
    numberStr = numberStr.replace(/-\d{2}-\d{2}$/, ''); // Remove -MM-DD
    numberStr = numberStr.replace(/^\d{2}-/, ''); // Remove YY-
    
    const num = parseInt(numberStr, 10);
    return isNaN(num) ? 0 : num;
  }

  return 0;
}

/**
 * Check if counter should reset based on resetOn setting
 */
function checkResetCounter(
  resetOn: 'never' | 'month' | 'year',
  lastResetDate?: string
): boolean {
  if (resetOn === 'never' || !lastResetDate) {
    return false;
  }

  const now = new Date();
  const lastReset = new Date(lastResetDate);

  if (resetOn === 'month') {
    return now.getMonth() !== lastReset.getMonth() ||
           now.getFullYear() !== lastReset.getFullYear();
  }

  if (resetOn === 'year') {
    return now.getFullYear() !== lastReset.getFullYear();
  }

  return false;
}

/**
 * Reset invoice number counter for a column
 */
export async function resetInvoiceCounter(
  columnId: string,
  resetTo?: number
): Promise<void> {
  const column = await prisma.column.findUnique({
    where: { id: columnId },
  });

  if (!column || column.type !== 'AUTO_NUMBER') {
    throw new Error('Column is not an AUTO_NUMBER type');
  }

  const settings = (column.settings as InvoiceNumberSettings) || {};
  const startNumber = resetTo ?? settings.startNumber ?? 1;

  await prisma.column.update({
    where: { id: columnId },
    data: {
      settings: {
        ...settings,
        lastCounter: startNumber - 1, // Will be incremented on next generation
        lastResetDate: new Date().toISOString().split('T')[0],
      } as any,
    },
  });
}


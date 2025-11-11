// Currency conversion controller

import { Request, Response } from 'express';
import { ApiResponse } from '@/types';
import { getExchangeRate } from '../services/invoiceCalculationService';

export class CurrencyController {
  /**
   * Get currency exchange rate
   */
  static async getExchangeRate(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;

      if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
        const response: ApiResponse = {
          success: false,
          message: 'Invalid currency parameters',
          error: 'from and to currencies are required',
        };
        res.status(400).json(response);
        return;
      }

      const rate = await getExchangeRate(from.toUpperCase(), to.toUpperCase());

      const response: ApiResponse = {
        success: true,
        message: 'Exchange rate retrieved successfully',
        data: { rate, from: from.toUpperCase(), to: to.toUpperCase() },
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch exchange rate',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }
}


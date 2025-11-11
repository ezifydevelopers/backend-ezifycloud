import { Request, Response } from 'express';
import { AIService } from '../services/aiService';
import {
  TextGenerationRequest,
  SmartSearchRequest,
  PredictionRequest,
  InsightRequest,
  AutoTaggingRequest,
  FormulaSuggestionRequest,
  EmailDraftRequest,
} from '../types';

export class AIController {
  /**
   * Generate text (description, comment, email, summary)
   */
  static async generateText(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const request = req.body as TextGenerationRequest;
      
      if (!request.type) {
        res.status(400).json({
          success: false,
          message: 'Type is required',
        });
        return;
      }

      const result = await AIService.generateText(request);

      res.status(200).json({
        success: true,
        message: 'Text generated successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error generating text:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate text',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Smart semantic search
   */
  static async smartSearch(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const request = req.body as SmartSearchRequest;
      
      if (!request.query) {
        res.status(400).json({
          success: false,
          message: 'Query is required',
        });
        return;
      }

      const result = await AIService.smartSearch(request);

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error in smart search:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform search',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate predictions
   */
  static async generatePrediction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const request = req.body as PredictionRequest;
      
      if (!request.type) {
        res.status(400).json({
          success: false,
          message: 'Type is required',
        });
        return;
      }

      const result = await AIService.generatePrediction(request);

      res.status(200).json({
        success: true,
        message: 'Prediction generated successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error generating prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate prediction',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate insights
   */
  static async generateInsights(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const request = req.body as InsightRequest;
      
      if (!request.type) {
        res.status(400).json({
          success: false,
          message: 'Type is required',
        });
        return;
      }

      const result = await AIService.generateInsights(request);

      res.status(200).json({
        success: true,
        message: 'Insights generated successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate insights',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Auto-tagging
   */
  static async autoTagging(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const request = req.body as AutoTaggingRequest;
      
      if (!request.itemId) {
        res.status(400).json({
          success: false,
          message: 'Item ID is required',
        });
        return;
      }

      const result = await AIService.autoTagging(request);

      res.status(200).json({
        success: true,
        message: 'Auto-tagging completed successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error in auto-tagging:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform auto-tagging',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Formula suggestions
   */
  static async suggestFormulas(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const request = req.body as FormulaSuggestionRequest;
      
      if (!request.boardId) {
        res.status(400).json({
          success: false,
          message: 'Board ID is required',
        });
        return;
      }

      const result = await AIService.suggestFormulas(request);

      res.status(200).json({
        success: true,
        message: 'Formula suggestions generated successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error suggesting formulas:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate formula suggestions',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Email draft generation
   */
  static async generateEmailDraft(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const request = req.body as EmailDraftRequest;

      const result = await AIService.generateEmailDraft(request);

      res.status(200).json({
        success: true,
        message: 'Email draft generated successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error generating email draft:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate email draft',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}


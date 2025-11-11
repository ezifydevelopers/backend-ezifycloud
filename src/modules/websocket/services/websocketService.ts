// WebSocket service for managing connections and broadcasting events

import { WebSocketServer, WebSocket as WS } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { APP_CONFIG } from '../../../config/app';
import { WebSocketClient, WebSocketMessage, WebSocketEventType } from '../types';

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly PING_TIMEOUT = 10000; // 10 seconds

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      clientTracking: true,
    });

    this.wss.on('connection', (socket: WS, req) => {
      this.handleConnection(socket, req);
    });

    // Start heartbeat
    this.startHeartbeat();

    console.log('✅ WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: WS, req: any): Promise<void> {
    try {
      // Extract token from query string or Authorization header
      const token = this.extractToken(req);
      
      if (!token) {
        socket.close(1008, 'Authentication required');
        return;
      }

      // Verify token
      const decoded = jwt.verify(token, APP_CONFIG.JWT.SECRET) as { userId: string };
      const userId = decoded.userId;

      // Create client
      const clientId = `${userId}-${Date.now()}`;
      const client: WebSocketClient = {
        id: clientId,
        userId,
        socket,
        connectedAt: new Date(),
        lastPing: new Date(),
        subscribedBoards: new Set(),
        subscribedWorkspaces: new Set(),
      };

      this.clients.set(clientId, client);

      // Send connection confirmation
      this.sendToClient(clientId, {
        type: WebSocketEventType.CONNECT,
        payload: { clientId, userId },
        timestamp: new Date().toISOString(),
      });

      // Handle messages
      socket.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.sendError(clientId, 'Invalid message format');
        }
      });

      // Handle close
      socket.on('close', () => {
        this.handleDisconnection(clientId);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.handleDisconnection(clientId);
      });

      console.log(`✅ WebSocket client connected: ${clientId} (user: ${userId})`);
    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
      socket.close(1008, 'Authentication failed');
    }
  }

  /**
   * Extract JWT token from request
   */
  private extractToken(req: any): string | null {
    // Try query parameter first
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tokenFromQuery = url.searchParams.get('token');
    if (tokenFromQuery) return tokenFromQuery;

    // Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case WebSocketEventType.PING:
        client.lastPing = new Date();
        this.sendToClient(clientId, {
          type: WebSocketEventType.PONG,
          payload: {},
          timestamp: new Date().toISOString(),
        });
        break;

      case 'subscribe:board':
        if (message.payload && typeof message.payload === 'object' && 'boardId' in message.payload) {
          const { boardId } = message.payload as { boardId: string };
          client.subscribedBoards.add(boardId);
          console.log(`Client ${clientId} subscribed to board ${boardId}`);
        }
        break;

      case 'subscribe:workspace':
        if (message.payload && typeof message.payload === 'object' && 'workspaceId' in message.payload) {
          const { workspaceId } = message.payload as { workspaceId: string };
          client.subscribedWorkspaces.add(workspaceId);
          console.log(`Client ${clientId} subscribed to workspace ${workspaceId}`);
        }
        break;

      case 'unsubscribe:board':
        if (message.payload && typeof message.payload === 'object' && 'boardId' in message.payload) {
          const { boardId } = message.payload as { boardId: string };
          client.subscribedBoards.delete(boardId);
          console.log(`Client ${clientId} unsubscribed from board ${boardId}`);
        }
        break;

      case 'unsubscribe:workspace':
        if (message.payload && typeof message.payload === 'object' && 'workspaceId' in message.payload) {
          const { workspaceId } = message.payload as { workspaceId: string };
          client.subscribedWorkspaces.delete(workspaceId);
          console.log(`Client ${clientId} unsubscribed from workspace ${workspaceId}`);
        }
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`❌ WebSocket client disconnected: ${clientId} (user: ${client.userId})`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WS.OPEN) {
      return;
    }

    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
    }
  }

  /**
   * Send error message to client
   */
  private sendError(clientId: string, error: string): void {
    this.sendToClient(clientId, {
      type: WebSocketEventType.ERROR,
      payload: { error },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast message to all clients subscribed to a board
   */
  broadcastToBoard(boardId: string, message: WebSocketMessage): void {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.subscribedBoards.has(boardId) && client.socket.readyState === WS.OPEN) {
        this.sendToClient(client.id, message);
        count++;
      }
    });
    if (count > 0) {
      console.log(`📢 Broadcasted to ${count} clients on board ${boardId}`);
    }
  }

  /**
   * Broadcast message to all clients subscribed to a workspace
   */
  broadcastToWorkspace(workspaceId: string, message: WebSocketMessage): void {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.subscribedWorkspaces.has(workspaceId) && client.socket.readyState === WS.OPEN) {
        this.sendToClient(client.id, message);
        count++;
      }
    });
    if (count > 0) {
      console.log(`📢 Broadcasted to ${count} clients in workspace ${workspaceId}`);
    }
  }

  /**
   * Broadcast message to specific user
   */
  broadcastToUser(userId: string, message: WebSocketMessage): void {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.userId === userId && client.socket.readyState === WS.OPEN) {
        this.sendToClient(client.id, message);
        count++;
      }
    });
    if (count > 0) {
      console.log(`📢 Broadcasted to ${count} client(s) for user ${userId}`);
    }
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = this.PING_TIMEOUT;

      this.clients.forEach((client, clientId) => {
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
        
        if (timeSinceLastPing > timeout) {
          // Send ping
          if (client.socket.readyState === WS.OPEN) {
            try {
              client.socket.ping();
            } catch (error) {
              console.error(`Error pinging client ${clientId}:`, error);
              this.handleDisconnection(clientId);
            }
          } else {
            // Connection is closed, remove client
            this.handleDisconnection(clientId);
          }
        }
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalClients: number;
    connectedUsers: number;
    clientsByUser: Record<string, number>;
  } {
    const clientsByUser: Record<string, number> = {};
    const uniqueUsers = new Set<string>();

    this.clients.forEach((client) => {
      uniqueUsers.add(client.userId);
      clientsByUser[client.userId] = (clientsByUser[client.userId] || 0) + 1;
    });

    return {
      totalClients: this.clients.size,
      connectedUsers: uniqueUsers.size,
      clientsByUser,
    };
  }

  /**
   * Cleanup
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.close();
      }
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    console.log('✅ WebSocket server shut down');
  }
}

// Singleton instance
export const websocketService = new WebSocketService();


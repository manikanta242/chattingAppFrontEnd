import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { WsEvent } from '../../../models/message.model';
import { environment } from '../../../environment/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<WsEvent>();

  // Any component can subscribe to this to receive real-time events
  messages$: Observable<WsEvent> = this.messageSubject.asObservable();

  private reconnectDelay = 3000; // retry after 3s if disconnected
  private isConnected = false;

  constructor(private authService: AuthService) {}

  // ── Connect to ws://localhost:8000/ws/chat?token=eyJ... ──
  connect(): void {
    if (this.isConnected) return;

    const token = this.authService.getToken();
    if (!token) return;

    const url = `${environment.wsUrl}/ws/chat?token=${token}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
    };

    // Every message from server flows through messageSubject
    // Components subscribe to messages$ to receive them
    this.socket.onmessage = (event) => {
      const data: WsEvent = JSON.parse(event.data);      
      this.messageSubject.next(data);
    };

    this.socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    this.socket.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code);
      this.isConnected = false;

      // Auto-reconnect if not intentional logout
      if (event.code !== 1000 && event.code !== 4001) {
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    };
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // ── SEND: Chat message ───────────────────────────────────
  // Matches: { "type": "message", "receiver_id": 2, "context": "Hey!" }
  sendMessage(receiver_id: number, context: string): void {
    this.send({ type: 'message', receiver_id, context });
  }

  // ── SEND: Typing indicator ───────────────────────────────
  // Matches: { "type": "typing", "receiver_id": 2, "is_typing": true }
  sendTyping(receiver_id: number, is_typing: boolean): void {
    this.send({ type: 'typing', receiver_id, is_typing });
  }

  // ── SEND: Read receipt ───────────────────────────────────
  // Matches: { "type": "read", "receiver_id": 2 }
  sendRead(receiver_id: number): void {
    this.send({ type: 'read', receiver_id });
  }

  // ── Disconnect cleanly ───────────────────────────────────
  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'User logged out');
      this.isConnected = false;
    }
  }

  // ── Private: send any JSON payload ──────────────────────
  private send(payload: object): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    } else {
      console.warn('WebSocket not open. Message not sent.');
    }
  }
}

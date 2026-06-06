import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { WsEvent } from '../../../models/message.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<WsEvent>();

  // Any component can subscribe to this to receive real-time events
  messages$: Observable<WsEvent> = this.messageSubject.asObservable();

  private reconnectDelay = 3000; // retry after 3s if disconnected
  private isConnected = false;

  constructor(private authService: AuthService) {}

  connect(): void {
    // ✅ Check actual socket state, not just the flag
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) return;

    const token = this.authService.getToken();
    console.log('token, token', token);

    if (!token) return;

    const url = `${environment.wsUrl}/ws/chat?token=${token}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
    };

    this.socket.onmessage = (event) => {
      const data: WsEvent = JSON.parse(event.data);
      console.log('📨 WS event received:', data); // ← confirms events flowing
      this.messageSubject.next(data);
    };

    this.socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.isConnected = false;
    };

    this.socket.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code);
      this.isConnected = false;

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
      this.isConnected = false;
      this.connect();

      // ✅ Wait for connection to open, then send
      const waitAndSend = setInterval(() => {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify(payload));
          clearInterval(waitAndSend);
        }
      }, 100);

      // ✅ Stop trying after 5 seconds
      setTimeout(() => clearInterval(waitAndSend), 5000);
    }
  }
}

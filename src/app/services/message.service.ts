import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';
import { GetMessagesRequest } from '../../../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {

  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── POST /message/get-messages ───────────────────────────
  // Load chat history between two users
  // Body: { sender_id: 1, receiver_id: 2 }
  // Used when opening a chat — loads offline messages too
  getMessages(data: GetMessagesRequest): Observable<any> {
    return this.http.post(`${this.api}/message/get-messages`, data);
  }

  // ── POST /message/send_message ───────────────────────────
  // REST fallback — WebSocket handles real-time sending
  // Body: { sender_id: 1, receiver_id: 2, context: "Hello" }
  sendMessage(sender_id: number, receiver_id: number, context: string): Observable<any> {
    return this.http.post(`${this.api}/message/send_message`, {
      sender_id,
      receiver_id,
      context
    });
  }
}
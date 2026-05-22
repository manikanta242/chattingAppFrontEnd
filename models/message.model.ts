// Matches message/models.py Message table
export interface Message {
  id:          number;
  sender_id:   number;
  sender_name: string;
  receiver_id: number;
  context:     string;   // your column is "context" not "content"
  created_at:  string;
}

// Matches message/schemas.py MessageListSchema
export interface GetMessagesRequest {
  sender_id:   number;
  receiver_id: number;
}

// ── WebSocket events — match exactly what websockets.py sends ──

export interface WsMessageEvent {
  type:        'message';
  id:          number;
  sender_id:   number;
  sender_name: string;
  receiver_id: number;
  context:     string;
  created_at:  string;
}

export interface WsTypingEvent {
  type:         'typing';
  from_user_id: number;
  from_name:    string;
  is_typing:    boolean;
}

export interface WsReadEvent {
  type:         'read';
  from_user_id: number;
  from_name:    string;
}

export interface WsPresenceEvent {
  type:    'presence';
  user_id: number;
  name:    string;
  status:  'online' | 'offline';
}

export interface WsErrorEvent {
  type:    'error';
  message: string;
}

export type WsEvent =
  | WsMessageEvent
  | WsTypingEvent
  | WsReadEvent
  | WsPresenceEvent
  | WsErrorEvent;
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Message, WsEvent } from '../../../../models/message.model';
import { MessageService } from '../../services/message.service';
import { FriendService } from '../../services/friend.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';

interface OnlineStatus {
  [userId: number]: boolean;
}
interface TypingStatus {
  [userId: number]: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.component.html',
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  // ── State ─────────────────────────────────────────────────
  friends: any[] = []; // accepted friends list
  messages: Message[] = []; // current chat messages
  selectedFriend: any = null; // who you're chatting with
  newMessage = ''; // input box value
  currentUserId: number;
  currentUserName: string;
  pendingRequests: any[] = [];

  onlineStatus: OnlineStatus = {}; // { userId: true/false }
  typingStatus: TypingStatus = {}; // { userId: true/false }

  private typingTimer: any; // debounce timer
  private wsSub!: Subscription;
  pendingCount: number = 0;

  constructor(
    private wsService: WebSocketService,
    private messageService: MessageService,
    private friendService: FriendService,
    private authService: AuthService,
  ) {
    this.currentUserId = this.authService.getUserId();
    this.currentUserName = this.authService.getUserName();
  }

  ngOnInit(): void {
    this.loadFriends();
    this.listenToWebSocket();
    this.loadPendingRequests();
    this.friendService.pendingCount$.subscribe((count) => {
      this.pendingCount = count;
    });
  }

  // ── Load accepted friends from POST /friends/friend-list ──
  loadFriends(): void {
    this.friendService
      .getFriendsList({ from_user: this.currentUserId })
      .subscribe({
        next: (res) => {
          this.friends = res.response || [];

          // ✅ Spread — Angular detects change
          const statusMap: { [key: number]: boolean } = {};
          this.friends.forEach((friend) => {
            console.log(friend);

            statusMap[friend.id] = friend.status === 'online';
          });          
          this.onlineStatus = { ...statusMap };
        },
        error: (err) => {
          console.error('Failed to load friends:', err);
        },
      });
  }

  loadPendingRequests(): void {
    this.friendService.getPendingRequests(this.currentUserId).subscribe({
      next: (res) => {
        this.pendingRequests = res.response || [];
        console.log('pendingRequests', this.pendingRequests.length);
        this.friendService.setPendingCount(this.pendingRequests.length);
      },
    });
  }
  // ── Open a chat with a friend ────────────────────────────
  openChat(friend: any): void {
    this.selectedFriend = friend;
    this.messages = [];
    this.typingStatus = {};

    // Determine the friend's user id from FriendRequest row
    const friendUserId =
      friend.from_user === this.currentUserId
        ? friend.to_user
        : friend.from_user;

    // Load chat history from POST /message/get-messages
    this.messageService
      .getMessages({
        sender_id: this.currentUserId,
        receiver_id: friendUserId,
      })
      .subscribe({
        next: (res) => {
          this.messages = res.response || [];
          this.scrollToBottom();

          // Send read receipt for the last message
          this.wsService.sendRead(friendUserId);
        },
      });
  }

  // ── Subscribe to all WebSocket events ────────────────────
  listenToWebSocket(): void {
    this.wsSub = this.wsService.messages$.subscribe((event: WsEvent) => {
      switch (event.type) {
        // New message received
        case 'message':
          if (this.selectedFriend) {
            const friendId = this.getFriendUserId();
            if (
              event.sender_id === friendId ||
              event.receiver_id === friendId
            ) {
              const exists = this.messages.some((m) => m.id === event.id);
              if (!exists) {
                this.messages.push({
                  id: event.id,
                  sender_id: event.sender_id,
                  sender_name: event.sender_name,
                  receiver_id: event.receiver_id,
                  context: event.context,
                  created_at: event.created_at,
                });
                this.scrollToBottom();
              }
            }
          }
          break;

        // ✅ Online / offline presence only
        case 'presence':
          this.onlineStatus[event.user_id] = event.status === 'online';
          break;

        case 'error':
          console.error('WS Error:', event.message);
          break;
      }
    });
  }

  // ── Send a message ────────────────────────────────────────
  sendMessage(): void {
    const context = this.newMessage.trim();
    if (!context || !this.selectedFriend) return;

    const friendUserId = this.getFriendUserId();

    // Send via WebSocket — matches your ws event format:
    // { "type": "message", "receiver_id": 2, "context": "Hey!" }
    this.wsService.sendMessage(friendUserId, context);

    this.newMessage = '';

    // Stop typing indicator
    this.wsService.sendTyping(friendUserId, false);
  }

  // ── Typing indicator — fires while user types ─────────────
  onTyping(): void {
    const friendUserId = this.getFriendUserId();
    if (!friendUserId) return;

    // Send typing: true
    this.wsService.sendTyping(friendUserId, true);

    // After 2 seconds of no typing → send typing: false
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.wsService.sendTyping(friendUserId, false);
    }, 2000);
  }

  // ── Get the friend's user ID from FriendRequest row ───────
  getFriendUserId(): number {
    if (!this.selectedFriend) return 0;
    return this.selectedFriend.from_user === this.currentUserId
      ? this.selectedFriend.to_user
      : this.selectedFriend.from_user;
  }

  // ── Is the current friend online? ────────────────────────
  isFriendOnline(): boolean {
    return this.onlineStatus[this.getFriendUserId()] || false;
  }

  // ── Is friend typing? ────────────────────────────────────
  isFriendTyping(): boolean {
    return this.typingStatus[this.getFriendUserId()] || false;
  }

  // ── Scroll chat to bottom ─────────────────────────────────
  scrollToBottom(): void {
    setTimeout(() => {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  // component.ts
  logout(): void {
    const userId = localStorage.getItem('user_id')!; // ✅ get before clear

    this.wsService.disconnect(); // ✅ disconnect websocket

    // ✅ Subscribe so HTTP actually fires
    this.authService.logout(userId).subscribe({
      next: () => {
        this.authService.clearSession(); // ✅ clear after API success
      },
      error: (err) => {
        console.error('Logout failed:', err);
        this.authService.clearSession(); // ✅ clear even if API fails
      },
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    clearTimeout(this.typingTimer);
  }
}

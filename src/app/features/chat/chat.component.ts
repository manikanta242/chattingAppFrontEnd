import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Message, WsEvent } from '../../../../models/message.model';
import { MessageService } from '../../services/message.service';
import { FriendService } from '../../services/friend.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { ProfileComponent } from '../auth/profile/profile.component';
import { environment } from '../../../environments/environment';
interface OnlineStatus {
  [userId: number]: boolean;
}
interface TypingStatus {
  [userId: number]: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProfileComponent],
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
  onlineStatus: { [user_id: number]: boolean } = {};
  typingStatus: TypingStatus = {}; // { userId: true/false }
  mobileSidebarOpen = true;
  unreadCounts: { [friendId: number]: number } = {};
  private typingTimer: any; // debounce timer
  private wsSub!: Subscription;
  pendingCount: number = 0;
  showProfile = false;
  currentUser: any = null;
  api = environment.apiUrl;
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
    this.authService.getProfile().subscribe({
      next: (res) => (this.currentUser = res),
    });
    console.log('currentUser', this.currentUser);
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
            statusMap[Number(friend.friend_id)] = friend.status === 'online'; // ✅
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
    console.log(friend);

    this.selectedFriend = friend;
    this.mobileSidebarOpen = false;
    this.messages = [];
    this.typingStatus = {};

    // Determine the friend's user id from FriendRequest row
    const friendUserId = Number(friend.friend_id);

    // ✅ Clear unread badge when opening chat
    this.unreadCounts = { ...this.unreadCounts, [friendUserId]: 0 };

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
          // ✅ Only send read if socket is open
          // if (this.wsService.isOpen()) {
          this.wsService.sendRead(friendUserId);
          // }
        },
      });
  }

  // ── Subscribe to all WebSocket events ────────────────────
  listenToWebSocket(): void {
    this.wsSub = this.wsService.messages$.subscribe((event: WsEvent) => {
      switch (event.type) {
        // ✅ Online / Offline status
        case 'presence':
          this.onlineStatus = {
            ...this.onlineStatus,
            [Number(event.user_id)]: event.status === 'online', // ✅ force number
          };
          break;
        // New message received
        case 'message':
          if (this.selectedFriend) {
            const friendId = this.selectedFriend.friend_id;
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
            // ✅ Increment unread if message is from someone other than open chat
            if (event.sender_id !== this.currentUserId) {
              const isCurrentChat =
                this.selectedFriend &&
                Number(this.selectedFriend.friend_id) === event.sender_id;

              if (!isCurrentChat) {
                this.unreadCounts = {
                  ...this.unreadCounts,
                  [event.sender_id]:
                    (this.unreadCounts[event.sender_id] || 0) + 1,
                };
              }
            }
          }
          break;
        case 'typing':
          this.typingStatus = {
            ...this.typingStatus,
            [Number(event.from_user_id)]: event.is_typing,
          };
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
    const friendUserId = this.selectedFriend.friend_id;

    // Send via WebSocket — matches your ws event format:
    // { "type": "message", "receiver_id": 2, "context": "Hey!" }
    this.wsService.sendMessage(friendUserId, context);

    this.newMessage = '';

    // Stop typing indicator
    this.wsService.sendTyping(friendUserId, false);
    clearTimeout(this.typingTimer);
  }

  onTyping(): void {
    if (!this.selectedFriend) return;
    const friendUserId = Number(this.selectedFriend.friend_id);

    this.wsService.sendTyping(friendUserId, true);

    // Auto-stop after 2s of no input
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.wsService.sendTyping(friendUserId, false);
    }, 2000);
  }

  isFriendTyping(friendId: number): boolean {
    return this.typingStatus[Number(friendId)] ?? false;
  }

  // ── Scroll chat to bottom ─────────────────────────────────
  scrollToBottom(): void {
    setTimeout(() => {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  backToSidebar(): void {
    this.mobileSidebarOpen = true;
  }

  showLogoutModal = false;

  // ✅ replace your existing logout() with this
  logout() {
    this.showLogoutModal = true; // show modal
  }

  cancelLogout() {
    this.showLogoutModal = false; // close modal
  }

  // component.ts
  confirmLogout(): void {
    this.showLogoutModal = false;

    const userId = String(this.currentUserId);
    this.authService.logout(userId).subscribe({
      next: () => {
        this.wsService.disconnect();
        this.authService.clearSession();
      },
      error: () => {
        // Even if API fails, still disconnect and clear locally
        this.wsService.disconnect();
        this.authService.clearSession();
      },
    });
  }

  goToProfile() {
    this.showProfile = true;
  }
  closeProfile() {
    this.showProfile = false;
  }

  onProfileUpdated(updatedUser: any) {
    this.currentUser = { ...this.currentUser, ...updatedUser }; // merge updated data
    this.showProfile = false; // close modal after save
  }

  isFriendOnline(friendId: number): boolean {
    return this.onlineStatus[Number(friendId)] ?? false; // ✅ force number
  }

  getUnreadCount(friendId: number): number {
    return this.unreadCounts[Number(friendId)] || 0;
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    clearTimeout(this.typingTimer);
  }
}

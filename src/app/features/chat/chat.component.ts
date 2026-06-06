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
import { ChatService } from '../../services/chat.service';
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
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  // ── State ─────────────────────────────────────────────────
  friends: any[] = []; // accepted friends list
  messages: Message[] = []; // current chat messages
  selectedFriend: any = null; // who you're chatting with
  newMessage = '';
  autocorrectSuggestion = '';
  private autocorrectTimer: any;
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
  searchQuery: string = '';
  filteredFriends: any[] = [];
  constructor(
    private wsService: WebSocketService,
    private messageService: MessageService,
    private friendService: FriendService,
    private authService: AuthService,
    private chatService: ChatService,
  ) {
    this.currentUserId = this.authService.getUserId();
    this.currentUserName = this.authService.getUserName();
  }

  ngOnInit(): void {
    this.wsService.connect();
    this.loadFriends();
    this.listenToWebSocket();
    this.loadPendingRequests();
    this.friendService.pendingCount$.subscribe((count) => {
      this.pendingCount = count;
    });
    this.authService.getProfile().subscribe({
      next: (res) => (this.currentUser = res),
    });
  }

  // ── Load accepted friends from POST /friends/friend-list ──
  loadFriends(): void {
    this.friendService
      .getFriendsList({ from_user: this.currentUserId })
      .subscribe({
        next: (res) => {
          this.friends = res.response || [];
          this.filteredFriends = res.response;

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

  onSearch() {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredFriends = this.friends; // show all if empty
      return;
    }
    this.filteredFriends = this.friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query),
    );
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredFriends = this.friends; // reset to all friends
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
          this.wsService.sendRead(friendUserId);
        },
      });
  }

  // ── Subscribe to all WebSocket events ────────────────────
  listenToWebSocket(): void {
    this.wsSub = this.wsService.messages$.subscribe((event: WsEvent) => {
      console.log('evvvv', event);
      switch (event.type) {
        // ✅ Online / Offline status
        case 'presence':
          console.log('presence user_id:', event.user_id, typeof event.user_id);
          console.log(
            'friends list:',
            this.friends.map((f) => ({
              name: f.name,
              friend_id: f.friend_id,
              type: typeof f.friend_id,
            })),
          );
          this.onlineStatus = {
            ...this.onlineStatus,
            [Number(event.user_id)]: event.status === 'online', // ✅ force number
          };
          break;
        // New message received
        case 'message':
          // ✅ Always increment unread for incoming messages
          if (event.sender_id !== this.currentUserId) {
            const isCurrentChat =
              this.selectedFriend &&
              Number(this.selectedFriend.friend_id) === Number(event.sender_id);

            if (!isCurrentChat) {
              this.unreadCounts = {
                ...this.unreadCounts,
                [Number(event.sender_id)]:
                  (this.unreadCounts[Number(event.sender_id)] || 0) + 1,
              };
            }
          }

          // ✅ Add to messages only if this chat is open
          if (
            this.selectedFriend &&
            (Number(event.sender_id) ===
              Number(this.selectedFriend.friend_id) ||
              Number(event.receiver_id) ===
                Number(this.selectedFriend.friend_id))
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

    this.wsService.sendMessage(friendUserId, context);
    this.newMessage = '';
    this.autocorrectSuggestion = '';
    this.wsService.sendTyping(friendUserId, false);
    clearTimeout(this.typingTimer);
  }

  onTyping(): void {
    if (!this.selectedFriend) return;
    const friendUserId = Number(this.selectedFriend.friend_id);

    this.wsService.sendTyping(friendUserId, true);
    this.autocorrectSuggestion = ''; // clear previous suggestion while typing

    // Auto-stop typing indicator after 2s
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.wsService.sendTyping(friendUserId, false);
    }, 2000);

    // Autocorrect after 1.2s pause — only if ≥4 chars
    clearTimeout(this.autocorrectTimer);
    if (this.newMessage.trim().length >= 4) {
      this.autocorrectTimer = setTimeout(() => {
        this.runAutocorrect();
      }, 1200);
    }
  }

  runAutocorrect(): void {
    const text = this.newMessage.trim();
    if (!text) return;
    this.chatService.autocorrect(text).subscribe({
      next: (res) => {
        if (res.changed && res.corrected) {
          this.autocorrectSuggestion = res.corrected;
        }
      },
    });
  }

  applyAutocorrect(): void {
    this.newMessage = this.autocorrectSuggestion;
    this.autocorrectSuggestion = '';
  }

  dismissAutocorrect(): void {
    this.autocorrectSuggestion = '';
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

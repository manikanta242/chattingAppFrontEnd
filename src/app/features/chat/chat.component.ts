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
import { ChatService } from '../../services/chat.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';

interface TypingStatus { [userId: number]: boolean; }

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SidebarComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;

  friends: any[] = [];
  filteredFriends: any[] = [];
  messages: Message[] = [];
  selectedFriend: any = null;
  newMessage = '';
  autocorrectSuggestion = '';
  searchQuery = '';
  mobileSidebarOpen = true;
  currentUserId: number;
  currentUserName: string;
  onlineStatus: { [user_id: number]: boolean } = {};
  typingStatus: TypingStatus = {};
  unreadCounts: { [friendId: number]: number } = {};

  private typingTimer: any;
  private autocorrectTimer: any;
  private wsSub!: Subscription;

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
  }

  loadFriends(): void {
    this.friendService.getFriendsList({ from_user: this.currentUserId }).subscribe({
      next: (res) => {
        this.friends = res.response || [];
        this.filteredFriends = [...this.friends];
        const statusMap: { [key: number]: boolean } = {};
        this.friends.forEach((f) => {
          statusMap[Number(f.friend_id)] = f.status === 'online';
        });
        this.onlineStatus = { ...statusMap };
      },
    });
  }

  loadPendingRequests(): void {
    this.friendService.getPendingRequests(this.currentUserId).subscribe({
      next: (res) => {
        this.friendService.setPendingCount((res.response || []).length);
      },
    });
  }

  onSearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredFriends = q
      ? this.friends.filter((f) =>
          f.name.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q),
        )
      : [...this.friends];
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredFriends = [...this.friends];
  }

  openChat(friend: any): void {
    this.selectedFriend = friend;
    this.mobileSidebarOpen = false;
    this.messages = [];
    this.typingStatus = {};
    const friendUserId = Number(friend.friend_id);
    this.unreadCounts = { ...this.unreadCounts, [friendUserId]: 0 };
    this.messageService.getMessages({ sender_id: this.currentUserId, receiver_id: friendUserId }).subscribe({
      next: (res) => {
        this.messages = res.response || [];
        this.scrollToBottom();
        this.wsService.sendRead(friendUserId);
      },
    });
  }

  listenToWebSocket(): void {
    this.wsSub = this.wsService.messages$.subscribe((event: WsEvent) => {
      switch (event.type) {
        case 'presence':
          this.onlineStatus = { ...this.onlineStatus, [Number(event.user_id)]: event.status === 'online' };
          break;
        case 'message':
          if (event.sender_id !== this.currentUserId) {
            const isCurrentChat = this.selectedFriend && Number(this.selectedFriend.friend_id) === Number(event.sender_id);
            if (!isCurrentChat) {
              this.unreadCounts = { ...this.unreadCounts, [Number(event.sender_id)]: (this.unreadCounts[Number(event.sender_id)] || 0) + 1 };
            }
          }
          if (this.selectedFriend && (Number(event.sender_id) === Number(this.selectedFriend.friend_id) || Number(event.receiver_id) === Number(this.selectedFriend.friend_id))) {
            if (!this.messages.some((m) => m.id === event.id)) {
              this.messages.push({ id: event.id, sender_id: event.sender_id, sender_name: event.sender_name, receiver_id: event.receiver_id, context: event.context, created_at: event.created_at });
              this.scrollToBottom();
            }
          }
          break;
        case 'typing':
          this.typingStatus = { ...this.typingStatus, [Number(event.from_user_id)]: event.is_typing };
          break;
      }
    });
  }

  sendMessage(): void {
    const context = this.newMessage.trim();
    if (!context || !this.selectedFriend) return;
    this.wsService.sendMessage(this.selectedFriend.friend_id, context);
    this.newMessage = '';
    this.autocorrectSuggestion = '';
    this.wsService.sendTyping(this.selectedFriend.friend_id, false);
    clearTimeout(this.typingTimer);
  }

  onTyping(): void {
    if (!this.selectedFriend) return;
    const friendUserId = Number(this.selectedFriend.friend_id);
    this.wsService.sendTyping(friendUserId, true);
    this.autocorrectSuggestion = '';
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.wsService.sendTyping(friendUserId, false), 2000);
    clearTimeout(this.autocorrectTimer);
    if (this.newMessage.trim().length >= 4) {
      this.autocorrectTimer = setTimeout(() => this.runAutocorrect(), 1200);
    }
  }

  runAutocorrect(): void {
    const text = this.newMessage.trim();
    if (!text) return;
    this.chatService.autocorrect(text).subscribe({
      next: (res) => { if (res.changed && res.corrected) this.autocorrectSuggestion = res.corrected; },
    });
  }

  applyAutocorrect(): void {
    this.newMessage = this.autocorrectSuggestion;
    this.autocorrectSuggestion = '';
  }

  dismissAutocorrect(): void { this.autocorrectSuggestion = ''; }

  isFriendTyping(friendId: number): boolean { return this.typingStatus[Number(friendId)] ?? false; }
  isFriendOnline(friendId: number): boolean { return this.onlineStatus[Number(friendId)] ?? false; }
  getUnreadCount(friendId: number): number { return this.unreadCounts[Number(friendId)] || 0; }
  backToSidebar(): void { this.mobileSidebarOpen = true; }

  scrollToBottom(): void {
    setTimeout(() => this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    clearTimeout(this.typingTimer);
    clearTimeout(this.autocorrectTimer);
  }
}

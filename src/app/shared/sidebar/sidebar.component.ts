import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FriendService } from '../../services/friend.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { ProfileComponent } from '../../features/auth/profile/profile.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, ProfileComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() activeRoute: 'chat' | 'status' | 'friends' | 'requests' | 'agent' = 'chat';

  pendingCount = 0;
  currentUser: any = null;
  showLogoutModal = false;
  showProfile = false;
  api = environment.apiUrl;

  private wsSub!: Subscription;

  constructor(
    private friendService: FriendService,
    private authService: AuthService,
    private wsService: WebSocketService,
  ) {}

  ngOnInit() {
    // Ensure WebSocket is connected on every protected page
    this.wsService.connect();

    const userId = this.authService.getUserId();

    // Single source of truth: pendingCount$ BehaviorSubject
    this.friendService.pendingCount$.subscribe((count) => {
      this.pendingCount = count;
    });

    // Fetch real count from API on init
    this.refreshPendingCount();

    // Load profile
    this.authService.getProfile().subscribe({
      next: (res) => (this.currentUser = res),
    });

    // Real-time: re-fetch from API when a friend_request event arrives
    // (avoids race conditions with manual increment)
    this.wsSub = this.wsService.messages$.subscribe((event) => {
      if (event.type === 'friend_request') {
        this.refreshPendingCount();
      }
    });
  }

  private refreshPendingCount() {
    const userId = this.authService.getUserId();
    this.friendService.getPendingRequests(userId).subscribe({
      next: (res) => {
        const count = (res.response || []).length;
        this.friendService.setPendingCount(count);
      },
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }

  openProfile() { this.showProfile = true; }
  closeProfile() { this.showProfile = false; }
  onProfileUpdated(updatedUser: any) {
    this.currentUser = { ...this.currentUser, ...updatedUser };
    this.showProfile = false;
  }

  logout() { this.showLogoutModal = true; }
  cancelLogout() { this.showLogoutModal = false; }
  confirmLogout() {
    this.showLogoutModal = false;
    const userId = String(this.authService.getUserId());
    this.authService.logout(userId).subscribe({
      next: () => this.authService.clearSession(),
      error: () => this.authService.clearSession(),
    });
  }
}

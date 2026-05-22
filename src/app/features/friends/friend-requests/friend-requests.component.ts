import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FriendService } from '../../../services/friend.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-friend-requests',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './friend-requests.component.html',
})
export class FriendRequestsComponent implements OnInit {
  pendingRequests: any[] = [];
  currentUserId: number;
  message = '';

  constructor(
    private friendService: FriendService,
    private authService: AuthService,
  ) {
    this.currentUserId = this.authService.getUserId();
  }

  ngOnInit(): void {
    this.loadPendingRequests();
  }

  // POST /friends/pending-request
  // Body: { to_user: currentUserId }
  loadPendingRequests(): void {
    this.friendService.getPendingRequests(this.currentUserId).subscribe({
      next: (res) => {
        this.pendingRequests = res.response || [];
        console.log('pendingRequests', this.pendingRequests.length);
        this.friendService.setPendingCount(this.pendingRequests.length);
      },
    });
  }

  // POST /friends/request — accept the request
  // Body: { from_user: request.from_user, to_user: currentUserId }
  acceptRequest(request: any): void {
    this.friendService
      .acceptRequest({
        from_user: request.id,
        to_user: this.currentUserId,
      })
      .subscribe({
        next: (res) => {
          this.message = res.response || 'Friend request accepted!';
          // Remove from pending list
          this.pendingRequests = this.pendingRequests.filter(
            (r) => r.id !== request.id,
          );
        },
      });
  }
}

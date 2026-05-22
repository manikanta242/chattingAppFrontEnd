import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FriendService } from '../../../services/friend.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-friend-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './friend-list.component.html',
})
export class FriendListComponent implements OnInit {
  allUsers: any[] = []; // from GET /auth/user
  friends: any[] = []; // from POST /friends/friend-list
  currentUserId: number;
  message = '';

  constructor(
    private friendService: FriendService,
    private authService: AuthService,
  ) {
    this.currentUserId = this.authService.getUserId();
  }

  ngOnInit(): void {
    this.loadRegisteredUsers();
  }

  // Load all registered users (to send friend requests)
  loadRegisteredUsers(): void {
    this.authService.getRegisteredUsers().subscribe({
      next: (res) => {
        // Exclude yourself
        this.allUsers = res.response;
      },
    });
  }

  // Load your accepted friends
  loadFriends(): void {
    this.friendService
      .getFriendsList({ from_user: this.currentUserId })
      .subscribe({
        next: (res) => {
          this.friends = res.response || [];
        },
      });
  }

  // POST /friends/connect — send a friend request
  // Body: { from_user: currentUserId, to_user: user.id }
  sendRequest(toUserId: number): void {
    this.friendService
      .sendRequest({
        from_user: this.currentUserId,
        to_user: toUserId,
      })
      .subscribe({
        next: (res) => {
          this.loadRegisteredUsers()
          this.message = res.response || 'Request sent!';
        },
      });
  }

  // Check if already friends
  isFriend(userId: number): boolean {
    return this.friends.some(
      (f) => f.from_user === userId || f.to_user === userId,
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FriendsListRequest,
  SendFriendRequest,
} from '../../../models/friend.model';

@Injectable({ providedIn: 'root' })
export class FriendService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ✅ Shared pending count across all components
  private pendingCount = new BehaviorSubject<number>(0);
  pendingCount$ = this.pendingCount.asObservable();
  // ✅ Call this to update count
  setPendingCount(count: number): void {
    this.pendingCount.next(count);
  }

  // ── POST /friends/connect ────────────────────────────────
  // Send a friend request
  // Body: { from_user: 1, to_user: 2 }
  sendRequest(data: SendFriendRequest): Observable<any> {
    return this.http.post(`${this.api}/friends/connect`, data);
  }

  // ── POST /friends/pending-request ───────────────────────
  // Get all pending requests received by a user
  // Body: { to_user: 2 }
  getPendingRequests(to_user: number): Observable<any> {
    return this.http.post(`${this.api}/friends/pending-request`, { to_user });
  }

  // ── POST /friends/request ────────────────────────────────
  // Accept a friend request
  // Body: { from_user: 1, to_user: 2 }
  acceptRequest(data: SendFriendRequest): Observable<any> {
    return this.http.post(`${this.api}/friends/request`, data);
  }

  // ── POST /friends/friend-list ────────────────────────────
  // Get accepted friends list
  // Body: { from_user: 1 }
  getFriendsList(data: FriendsListRequest): Observable<any> {
    return this.http.post(`${this.api}/friends/friend-list`, data);
  }
}

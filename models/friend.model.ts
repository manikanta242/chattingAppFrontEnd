// Matches friends/models.py FriendRequest table
export interface FriendRequest {
  id:        number;
  from_user: number;
  to_user:   number;
  status:    'pending' | 'accepted';
}

// Matches friends/schemas.py FriendRequestSchema
export interface SendFriendRequest {
  from_user: number;
  to_user:   number;
}

// Matches friends/schemas.py friendsListSchema
export interface FriendsListRequest {
  from_user: number;
}
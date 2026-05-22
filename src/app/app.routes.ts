import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Default → redirect to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Public routes — no guard
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },

  // Protected routes — must be logged in
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/chat.component').then(m => m.ChatComponent),
    canActivate: [authGuard]
  },
  {
    path: 'friends',
    loadComponent: () =>
      import('./features/friends/friend-list/friend-list.component').then(m => m.FriendListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'friends/requests',
    loadComponent: () =>
      import('./features/friends/friend-requests/friend-requests.component').then(m => m.FriendRequestsComponent),
    canActivate: [authGuard]
  },

  // Fallback
  { path: '**', redirectTo: 'login' }
];
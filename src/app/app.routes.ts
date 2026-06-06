import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Default → redirect to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Public routes — no guard
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent,
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // Protected routes — must be logged in
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/auth/profile/profile.component').then(
        (m) => m.ProfileComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'status',
    loadComponent: () =>
      import('./features/auth/status/status.component').then(
        (m) => m.StatusComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/chat.component').then((m) => m.ChatComponent),
    canActivate: [authGuard],
  },
  {
    path: 'friends',
    loadComponent: () =>
      import('./features/friends/friend-list/friend-list.component').then(
        (m) => m.FriendListComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'friends/requests',
    loadComponent: () =>
      import('./features/friends/friend-requests/friend-requests.component').then(
        (m) => m.FriendRequestsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'agent',
    loadComponent: () =>
      import('./features/agent/agent.component').then((m) => m.AgentComponent),
    canActivate: [authGuard],
  },

  // Fallback
  { path: '**', redirectTo: 'login' },
];

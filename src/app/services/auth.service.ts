import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environment/environment';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '../../../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.apiUrl;

  // Stores logged-in user info — any component can subscribe to this
  private currentUserSubject = new BehaviorSubject<LoginResponse | null>(
    this.getUserFromStorage(),
  );
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // ── POST /auth/register ──────────────────────────────────
  // Body: { name, email, phonenumber, password, location }
  register(data: RegisterRequest): Observable<any> {
    return this.http.post(`${this.api}/auth/register`, data);
  }

  // ── POST /auth/login ─────────────────────────────────────
  // Body: { email, password }
  // Response: { token, user_id, name, email }
  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, data).pipe(
      tap((response) => {
        console.log('repsonse', response);

        // Save to localStorage so user stays logged in after refresh
        localStorage.setItem('token', response.token);
        localStorage.setItem('user_id', String(response.user_id));
        localStorage.setItem('name', response.name);
        localStorage.setItem('email', response.email);
        this.currentUserSubject.next(response);
      }),
    );
  }

  // ── GET /auth/user ───────────────────────────────────────
  getAllUsers(): Observable<any> {
    return this.http.get(`${this.api}/auth/user`);
  }

  getRegisteredUsers(): Observable<any> {
    return this.http.get(`${this.api}/friends/registered-users`);
  }

  logout(user_id: string): Observable<any> {
    return this.http.post(`${this.api}/auth/logout`, {
      id: user_id,
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  getToken(): string | null {
    const raw = localStorage.getItem('token') || '';
    // Your backend returns "Bearer eyJ..." — strip the prefix for WebSocket
    return raw.replace('Bearer ', '').replace('bearer', '').trim();
  }

  getUserId(): number {
    return Number(localStorage.getItem('user_id'));
  }

  getUserName(): string {
    return localStorage.getItem('name') || '';
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  clearSession(): void {
    // ✅ Clear after API call completes
    localStorage.clear();
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private getUserFromStorage(): LoginResponse | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return {
      token,
      user_id: Number(localStorage.getItem('user_id')),
      name: localStorage.getItem('name') || '',
      email: localStorage.getItem('email') || '',
    };
  }
}

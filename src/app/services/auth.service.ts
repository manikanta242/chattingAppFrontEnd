import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from '../../../models/user.model';
import { environment } from '../../environments/environment';

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
  register(data: FormData): Observable<any> {
    return this.http.post(`${this.api}/auth/register`, data);
  }

  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.api}/auth/verify-email?token=${token}`);
  }

  // ── POST /auth/login ─────────────────────────────────────
  // Body: { email, password }
  // Response: { token, user_id, name, email }
  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, data).pipe(
      tap((response) => {
        const rawToken = response.token.replace(/^bearer\s+/i, '').trim();
        // Save to localStorage so user stays logged in after refresh
        localStorage.setItem('token', rawToken);
        localStorage.setItem('user_id', String(response.user_id));
        localStorage.setItem('name', response.name);
        localStorage.setItem('email', response.email);
        localStorage.setItem('image', response.image || ''); // ✅

        this.currentUserSubject.next({ ...response, token: rawToken });
      }),
    );
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.api}/auth/profile`);
  }

  updateProfile(formData: FormData): Observable<any> {
    return this.http.put(`${this.api}/auth/profile`, formData);
  }

  // ── GET /auth/user ───────────────────────────────────────
  getAllUsers(): Observable<any> {
    return this.http.get(`${this.api}/auth/user`);
  }

  getRegisteredUsers(): Observable<any> {
    return this.http.get(`${this.api}/friends/registered-users`);
  }

  forgotPassword(email: string): Observable<any> {
    const formData = new FormData();
    formData.append('email', email);
    return this.http.post(`${this.api}/auth/forgot-password`, formData);
  }

  resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ): Observable<any> {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('new_password', newPassword);
    formData.append('confirm_password', confirmPassword);
    return this.http.post(`${this.api}/auth/reset-password`, formData);
  }

  logout(user_id: string): Observable<any> {
    return this.http.post(`${this.api}/auth/logout`, {
      id: user_id,
    });
  }

  // ── Helpers ──────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserId(): number {
    return Number(localStorage.getItem('user_id'));
  }

  getUserName(): string {
    return localStorage.getItem('name') || '';
  }

  getUserImage(): string {
    return localStorage.getItem('image') || '';
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

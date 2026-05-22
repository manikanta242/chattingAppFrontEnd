import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { WebSocketService } from '../../../services/websocket.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  // Matches loginSchema: { email, password }
  form = { email: '', password: '' };
  error = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private wsService: WebSocketService,
    private router: Router,
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.error = '';

    this.authService.login(this.form).subscribe({
      next: () => {
        // After login → connect WebSocket → go to chat
        this.wsService.connect();
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.error = err.error.detail;
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}

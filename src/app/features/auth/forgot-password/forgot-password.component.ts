import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector   : 'app-forgot-password',
  standalone : true,
  imports    : [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  email   = '';
  loading = false;
  success = '';
  error   = '';

  constructor(private authService: AuthService) {}

  onSubmit() {
    if (!this.email) {
      this.error = 'Please enter your email';
      return;
    }
    this.loading = true;
    this.error   = '';
    this.success = '';

    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.success = `Reset link sent to ${this.email}`;
        this.loading = false;
      },
      error: (err) => {
        this.error   = err.error?.detail || 'Failed to send reset email';
        this.loading = false;
      }
    });
  }
}
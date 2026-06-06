import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector   : 'app-reset-password',
  standalone : true,
  imports    : [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  token           = '';
  newPassword     = '';
  confirmPassword = '';
  loading         = false;
  success         = '';
  error           = '';

  constructor(
    private route      : ActivatedRoute,
    private authService: AuthService,
    private router     : Router
  ) {}

  ngOnInit() {
    // get token from URL
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error = 'Invalid reset link';
    }
  }

  onSubmit() {
    this.error   = '';
    this.success = '';

    if (!this.newPassword || !this.confirmPassword) {
      this.error = 'All fields are required';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }
    if (this.newPassword.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.newPassword, this.confirmPassword).subscribe({
      next: (res) => {
        this.success = res.response;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error   = err.error?.detail || 'Reset failed. Link may be expired.';
        this.loading = false;
      }
    });
  }
}
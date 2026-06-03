import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  status: 'loading' | 'success' | 'error' = 'loading';
  message = '';
  resendEmail = '';
  resendLoading = false;
  resendSuccess = false;
  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    console.log('token', token);

    if (!token) {
      this.status = 'error';
      this.message = 'Invalid verification link';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.status = 'success';
        this.message = res.response;
        // redirect to login after 3 seconds
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        console.log(err);

        this.status = 'error';
        this.message = err.error?.detail || 'Verification failed';
      },
    });
  }

  // Add this method
  resendVerification() {
    if (!this.resendEmail) return;
    this.resendLoading = true;

    this.authService.resendVerification(this.resendEmail).subscribe({
      next: () => {
        this.resendLoading = false;
        this.resendSuccess = true;
      },
      error: () => {
        this.resendLoading = false;
        // still show success — don't reveal if email exists
        this.resendSuccess = true;
      },
    });
  }
}

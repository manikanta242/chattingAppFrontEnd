import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email.component.html'
})
export class VerifyEmailComponent implements OnInit {
  status  : 'loading' | 'success' | 'error' = 'loading';
  message = '';

  constructor(
    private route      : ActivatedRoute,
    private authService: AuthService,
    private router     : Router
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status  = 'error';
      this.message = 'Invalid verification link';
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.status  = 'success';
        this.message = res.response;
        // redirect to login after 3 seconds
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.status  = 'error';
        this.message = err.error?.detail || 'Verification failed';
      }
    });
  }
}
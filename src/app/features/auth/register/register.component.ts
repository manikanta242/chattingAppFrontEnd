import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html'
})
export class RegisterComponent {

  // Matches userSchema: { name, email, phonenumber, password, location }
  form = {
    name:        '',
    email:       '',
    phonenumber: '',
    password:    '',
    location:    ''
  };

  success = '';
  error   = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router:      Router
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.error   = '';
    this.success = '';

    this.authService.register(this.form).subscribe({
      next: (res) => {
        this.success = 'Registered successfully! Please login.';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: () => {
        this.error   = 'Registration failed. Try again.';
        this.loading = false;
      },
      complete: () => { this.loading = false; }
    });
  }
}
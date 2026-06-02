import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  // Matches userSchema: { name, email, phonenumber, password, location }
  form = {
    name: '',
    email: '',
    phonenumber: '',
    password: '',
    location: '',
  };

  success = '';
  error = '';
  loading = false;
  imagePreview: string = '';
  selectedFile: File | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      // just for preview
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
    }
  }

  onSubmit(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    const formData = new FormData();
    formData.append('name', this.form.name);
    formData.append('email', this.form.email);
    formData.append('phonenumber', this.form.phonenumber);
    formData.append('password', this.form.password);
    formData.append('location', this.form.location);

    if (this.selectedFile) {
      formData.append('image', this.selectedFile); // raw file
    }

    this.authService.register(formData).subscribe({
      next: (res) => {
        this.success = 'Registered successfully! Please login.';
      },
      error: () => {
        this.error = 'Registration failed. Try again.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}

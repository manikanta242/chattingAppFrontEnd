import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnChanges {
  @Input() user: any = {}; // receives user from parent
  @Output() close = new EventEmitter(); // tells parent to close modal
  @Output() updated = new EventEmitter(); // tells parent profile was updated
  private api = environment.apiUrl;
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  profileSuccess = '';
  profileError = '';
  profileLoading = false;

  constructor(private authService: AuthService) {}

  ngOnChanges() {
    // when user data arrives from parent, set image preview
    if (this.user?.image) {
      this.imagePreview = `${this.api}/${this.user.image}`;
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => (this.imagePreview = reader.result as string);
    }
  }

  saveProfile() {
    this.profileLoading = true;
    this.profileSuccess = '';
    this.profileError = '';

    const formData = new FormData();
    formData.append('name', this.user.name);
    formData.append('phonenumber', this.user.phonenumber);
    formData.append('location', this.user.location);
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.authService.updateProfile(formData).subscribe({
      next: (res) => {
        this.profileSuccess = 'Profile updated!';
        this.profileLoading = false;
        this.updated.emit(res); // notify parent with updated data
      },
      error: () => {
        this.profileError = 'Update failed. Try again.';
        this.profileLoading = false;
      },
    });
  }

  resetLoading = false;
  resetSuccess = '';
  resetError = '';

  sendPasswordReset() {
    this.resetLoading = true;
    this.resetSuccess = '';
    this.resetError = '';

    // use the email from current user
    this.authService.forgotPassword(this.user.email).subscribe({
      next: () => {
        this.resetSuccess = `Reset link sent to ${this.user.email}`;
        this.resetLoading = false;
      },
      error: (err) => {
        this.resetError = err.error?.detail || 'Failed to send reset email';
        this.resetLoading = false;
      },
    });
  }
  closeModal() {
    this.close.emit(); // tell parent to close
  }
}

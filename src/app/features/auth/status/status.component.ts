import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StatusService } from '../../../services/status.service';
import { Location } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { SidebarComponent } from '../../../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './status.component.html',
  styleUrl: './status.component.scss',
})
export class StatusComponent implements OnInit, OnDestroy {
  friendStatuses: any[] = [];
  selectedUser: any = null;
  showAddStatus = false;
  newText = '';
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  loading = false;
  api = environment.apiUrl;
  currentStatusIndex = 0;
  progressWidth = 0;
  progressInterval: any;
  currentUserName: any;
  currentUserId: number;
  myStatuses: any[] = [];

  private readonly STATUS_DURATION = 5000; // 5 seconds per status
  private readonly TICK_INTERVAL = 50; // update progress every 50ms

  constructor(
    private statusService: StatusService,
    private location: Location,
    private authService: AuthService,
  ) {
    this.currentUserName = this.authService.getUserName();
    this.currentUserId = this.authService.getUserId();
  }

  ngOnInit() {
    this.loadStatuses();
  }

  ngOnDestroy() {
    this.clearProgress();
  }

  loadStatuses() {
    this.statusService.getFriendsStatus().subscribe({
      next: (res) => {
        // split my status from friends
        this.myStatuses = res.filter(
          (u: any) => Number(u.user_id) === Number(this.currentUserId),
        );
        this.friendStatuses = res.filter(
          (u: any) => Number(u.user_id) !== Number(this.currentUserId),
        );
      },
    });
  }

  viewStatus(user: any) {
    this.selectedUser = user;
    this.currentStatusIndex = 0; // ✅ always start from first status
    this.progressWidth = 0;
    this.startProgress();
  }

  closeView() {
    this.clearProgress();
    this.selectedUser = null;
    this.currentStatusIndex = 0;
    this.progressWidth = 0;
  }

  // ✅ New method — go to previous status on left tap
  prevStatus(event: Event) {
    event.stopPropagation();
    this.clearProgress();
    if (this.currentStatusIndex > 0) {
      this.currentStatusIndex--;
      this.progressWidth = 0;
      this.startProgress();
    }
    // If already at first, just restart it
    else {
      this.progressWidth = 0;
      this.startProgress();
    }
  }

  // ✅ New method — go to next status on right tap
  nextStatus(event: Event) {
    event.stopPropagation();
    this.clearProgress();
    if (this.currentStatusIndex < this.selectedUser.statuses.length - 1) {
      this.currentStatusIndex++;
      this.progressWidth = 0;
      this.startProgress();
    } else {
      // Last status — close the viewer
      this.closeView();
    }
  }

  private startProgress() {
    this.clearProgress();
    const totalTicks = this.STATUS_DURATION / this.TICK_INTERVAL;
    const increment = 100 / totalTicks;

    this.progressInterval = setInterval(() => {
      this.progressWidth += increment;
      if (this.progressWidth >= 100) {
        this.progressWidth = 100;
        this.clearProgress();

        // Auto-advance to next status
        if (this.currentStatusIndex < this.selectedUser.statuses.length - 1) {
          this.currentStatusIndex++;
          this.progressWidth = 0;
          this.startProgress();
        } else {
          this.closeView(); // all statuses done
        }
      }
    }, this.TICK_INTERVAL);
  }

  private clearProgress() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => (this.imagePreview = reader.result as string);
    }
  }

  postStatus() {
    if (!this.newText && !this.selectedFile) return;
    this.loading = true;
    const formData = new FormData();
    if (this.newText) formData.append('content', this.newText);
    if (this.selectedFile) formData.append('image', this.selectedFile);

    this.statusService.createStatus(formData).subscribe({
      next: () => {
        this.newText = '';
        this.selectedFile = null;
        this.imagePreview = null;
        this.showAddStatus = false;
        this.loading = false;
        this.loadStatuses();
      },
      error: () => (this.loading = false),
    });
  }

  deleteStatus(id: number) {
    this.statusService.deleteStatus(id).subscribe({
      next: () => {
        this.closeView();
        this.loadStatuses();
      },
    });
  }

  goBack() {
    this.location.back();
  }
}

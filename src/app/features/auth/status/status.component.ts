import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StatusService } from '../../../services/status.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './status.component.html',
})
export class StatusComponent implements OnInit {
  friendStatuses: any[] = [];
  selectedUser: any = null; // whose statuses are being viewed
  showAddStatus = false;
  newText = '';
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  loading = false;

  constructor(
    private statusService: StatusService,
    private location: Location,
  ) {}

  ngOnInit() {
    this.loadStatuses();
  }

  loadStatuses() {
    this.statusService.getFriendsStatus().subscribe({
      next: (res) => (this.friendStatuses = res),
    });
    console.log(this.friendStatuses);
  }

  viewStatus(user: any) {
    this.selectedUser = user;
  }

  closeView() {
    this.selectedUser = null;
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

  onImgError(event: any) {
    console.log('image error:', event.target.src);
  }

  goBack() {
    this.location.back(); // goes to previous page
  }
}

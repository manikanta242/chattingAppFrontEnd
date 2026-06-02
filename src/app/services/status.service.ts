import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StatusService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getFriendsStatus(): Observable<any> {
    return this.http.get(`${this.api}/status/friends`);
  }

  createStatus(formData: FormData): Observable<any> {
    return this.http.post(`${this.api}/status`, formData);
  }

  deleteStatus(id: number): Observable<any> {
    return this.http.delete(`${this.api}/status/${id}`);
  }
}
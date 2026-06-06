import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Get 3 smart reply suggestions for the current conversation */
  getSuggestions(messages: { role: string; content: string }[]): Observable<{ suggestions: string[] }> {
    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<{ suggestions: string[] }>(
      `${this.api}/agent/suggestions`,
      { messages },
      { headers },
    );
  }

  async streamResponse(
    messages: { role: string; content: string }[],
    onChunk: (text: string) => void,
  ): Promise<void> {
    const token = localStorage.getItem('token') ?? '';
    const res = await fetch(this.api + '/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value));
    }
  }
}

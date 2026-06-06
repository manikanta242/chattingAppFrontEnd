import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar.component';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-agent',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './agent.component.html',
  styleUrl: './agent.component.scss',
})
export class AgentComponent {
  messages: ChatMessage[] = [];
  userInput = '';
  isStreaming = false;

  constructor(private chatService: ChatService) {}

  async send() {
    const text = this.userInput.trim();
    if (!text || this.isStreaming) return;

    this.messages.push({ role: 'user', content: text });
    this.userInput = '';
    this.isStreaming = true;

    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    this.messages.push(assistantMsg);

    try {
      await this.chatService.streamResponse(
        this.messages.slice(0, -1),
        (chunk) => {
          assistantMsg.content += chunk;
          this.messages = [...this.messages];
        },
      );
    } catch {
      assistantMsg.content = '⚠️ Something went wrong. Please try again.';
    } finally {
      this.isStreaming = false;
    }
  }

  clearChat() {
    this.messages = [];
  }
}

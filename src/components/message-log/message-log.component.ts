import { Component, input, ViewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-log.component.html',
  styleUrls: ['./message-log.component.scss']
})
export class MessageLogComponent {
  readonly messages = input.required<string[]>();

  @ViewChild('logContent') logContent?: ElementRef<HTMLDivElement>;

  constructor() {
    afterNextRender(() => {
      this.scrollToBottom();
    });
  }

  private scrollToBottom(): void {
    if (this.logContent) {
      const element = this.logContent.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}

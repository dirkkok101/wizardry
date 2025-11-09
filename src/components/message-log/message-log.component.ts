import { Component, input, computed } from '@angular/core';
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

  // Show newest messages first (reversed order)
  readonly reversedMessages = computed(() => {
    return [...this.messages()].reverse();
  });
}

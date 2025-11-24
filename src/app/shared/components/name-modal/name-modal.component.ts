// src/app/components/name-modal/name-modal.component.ts
import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-name-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './name-modal.component.html',
  styleUrl: './name-modal.component.scss'
})
export class NameModalComponent {
  @Input() visible = false;
  @Output() save = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  readonly characterName = signal<string>('');

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent) {
    if (!this.visible) return;

    if (event.key === 'Enter' && this.characterName().trim().length > 0) {
      event.preventDefault();
      event.stopPropagation(); // Prevent underlying components from handling this event
      this.save.emit(this.characterName().trim());
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation(); // Prevent underlying components from handling this event
      this.cancel.emit();
    }
  }

  onBackdropClick() {
    this.cancel.emit();
  }

  onSaveClick() {
    if (this.characterName().trim().length > 0) {
      this.save.emit(this.characterName().trim());
    }
  }

  onCancelClick() {
    this.cancel.emit();
  }
}

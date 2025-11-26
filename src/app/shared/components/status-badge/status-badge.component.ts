import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterStatus } from '@models/CharacterStatus';
import { getStatusColorClass } from '@utils/CharacterDisplayHelpers';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  @Input() status!: CharacterStatus;
  @Input() variant: 'badge' | 'inline' = 'badge';

  get statusColorClass(): string {
    return getStatusColorClass(this.status);
  }
}

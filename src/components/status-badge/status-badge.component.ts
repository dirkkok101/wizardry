import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterStatus } from '../../types/CharacterStatus';
import { getStatusColorClass } from '../../helpers/CharacterDisplayHelpers';

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

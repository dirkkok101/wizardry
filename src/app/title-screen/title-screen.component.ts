import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AssetLoadingService } from '../../services/AssetLoadingService';
import { SaveService } from '../../services/SaveService';
import { KeystrokeInputDirective } from '../../directives/keystroke-input.directive';

/**
 * Title Screen Component
 *
 * Entry point for the application. Displays the Wizardry title,
 * loads assets, checks for save data, and waits for user input.
 */
@Component({
  selector: 'app-title-screen',
  standalone: true,
  imports: [CommonModule, KeystrokeInputDirective],
  templateUrl: './title-screen.component.html',
  styleUrls: ['./title-screen.component.scss']
})
export class TitleScreenComponent implements OnInit {
  // Loading state
  readonly isLoading = signal(true);
  readonly canPressKey = signal(false);
  readonly hasSaveData = signal(false);

  // Navigation state
  private hasNavigated = false;

  constructor(
    private assetService: AssetLoadingService,
    private saveService: SaveService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      // Load title screen assets
      await this.assetService.loadTitleScreenAssets();

      // Check for existing save data
      const saveExists = await this.saveService.hasSaveData();
      this.hasSaveData.set(saveExists);

      // Ready for input
      this.isLoading.set(false);
      this.canPressKey.set(true);
    } catch (error) {
      console.error('Failed to load title screen:', error);
      // Show error state (future enhancement)
    }
  }

  handleKeyPress(event: KeyboardEvent): void {
    // Ignore if loading or already navigated
    if (this.isLoading() || this.hasNavigated) {
      return;
    }

    // Prevent repeated navigation
    this.hasNavigated = true;

    // Navigate to castle menu
    this.router.navigate(['/castle-menu']);
  }
}

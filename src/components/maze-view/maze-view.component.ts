import { Component, ElementRef, ViewChild, input, effect, ChangeDetectionStrategy, untracked } from '@angular/core';
import { CanvasCommand } from '../../types/rendering.types';

/**
 * Canvas-based 3D maze view component
 * Executes drawing commands from WireframeRenderingService
 */
@Component({
  selector: 'app-maze-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './maze-view.component.html',
  styleUrls: ['./maze-view.component.scss']
})
export class MazeViewComponent {
  readonly commands = input.required<CanvasCommand[]>();

  @ViewChild('mazeCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    // React to changes in commands signal
    effect(() => {
      const commands = this.commands(); // Subscribe to signal changes
      console.log(`[MazeView Effect] Triggering render with ${commands.length} commands`);

      // Only render if context is available (after ngAfterViewInit)
      if (this.ctx) {
        this.render();
      }
    });
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    this.render();
  }

  private render(): void {
    if (!this.ctx) {
      console.error('[MazeViewComponent] render - Canvas context not initialized!');
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const commands = this.commands();

    // Clear canvas with black background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Execute drawing commands
    for (const cmd of commands) {
      this.executeCommand(cmd);
    }

    console.log(`[Canvas] Drew ${commands.length} commands`);
  }

  private executeCommand(cmd: CanvasCommand): void {
    if (!this.ctx) return;

    // Apply command styling
    this.ctx.globalAlpha = cmd.alpha ?? 1.0;
    this.ctx.strokeStyle = cmd.color;
    this.ctx.fillStyle = cmd.color;
    this.ctx.lineWidth = cmd.lineWidth ?? 2;

    switch (cmd.type) {
      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(cmd.x, cmd.y);
        this.ctx.lineTo(cmd.x2!, cmd.y2!);
        this.ctx.stroke();
        break;
      case 'rect':
        this.ctx.strokeRect(cmd.x, cmd.y, cmd.width!, cmd.height!);
        break;
      case 'fillRect':
        this.ctx.fillRect(cmd.x, cmd.y, cmd.width!, cmd.height!);
        break;
      case 'fillPolygon':
        if (cmd.points && cmd.points.length > 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(cmd.points[0].x, cmd.points[0].y);
          for (let i = 1; i < cmd.points.length; i++) {
            this.ctx.lineTo(cmd.points[i].x, cmd.points[i].y);
          }
          this.ctx.closePath();
          this.ctx.fill();
        }
        break;
    }
  }
}

import { Component, ElementRef, ViewChild, input } from '@angular/core';
import { CanvasCommand } from '../../types/rendering.types';

/**
 * Canvas-based 3D maze view component
 * Executes drawing commands from MazeRenderingService
 */
@Component({
  selector: 'app-maze-view',
  standalone: true,
  templateUrl: './maze-view.component.html',
  styleUrls: ['./maze-view.component.scss']
})
export class MazeViewComponent {
  readonly commands = input.required<CanvasCommand[]>();

  @ViewChild('mazeCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    this.render();
  }

  ngOnChanges(): void {
    if (this.ctx) {
      this.render();
    }
  }

  private render(): void {
    if (!this.ctx) return;

    const canvas = this.canvasRef.nativeElement;
    const commands = this.commands();

    // Clear canvas with black background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Execute drawing commands
    for (const cmd of commands) {
      this.executeCommand(cmd);
    }
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
    }
  }
}

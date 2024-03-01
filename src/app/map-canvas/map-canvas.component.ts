import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { Polity, World, Tile } from '../world';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [],
  templateUrl: './map-canvas.component.html',
  styleUrl: './map-canvas.component.scss'
})
export class MapCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('worldCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private context!: CanvasRenderingContext2D | null;
  private deleteWatcher: Function|undefined;

  constructor(readonly world: World) {}

  ngAfterViewInit(): void {
    this.context = this.canvasRef.nativeElement.getContext('2d');
    this.draw();
    this.deleteWatcher = this.world.addWatcher(this.draw.bind(this));
  }

  readonly side = 80;

  draw(): void {
    const ctx = this.context;
    if (!ctx) return;

    let y = 0;
    for (let i = 0; i < this.world.map.width; ++i) {
      let x = 0;
      for (let j = 0; j < this.world.map.height; ++j) {
        const tile = this.world.map.tiles[i][j];
        ctx.fillStyle = this.tileColor(tile);
        ctx.fillRect(x, y, this.side, this.side);
        x += this.side;
      }
      y += this.side;
    }
  }

  tileColor(tile: Tile): string {
    const t = Math.min(tile.population, 5000) / 5000;
    const r = Math.floor(140 * (1 - t) + 10 * t);
    const g = Math.floor(100 * (1 - t) + 180 * t);
    const b = Math.floor(30 * (1-t) + 10 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  ngOnDestroy(): void {
    if (this.deleteWatcher) {
      this.world.removeWatcher(this.deleteWatcher);
    }
  }
}

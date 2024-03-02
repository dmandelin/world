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

    const map = this.world.map;
    const tt = map.tiles;

    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 400, 400);

    // Draw tiles.
    let y = 0;
    for (let i = 0; i < map.width; ++i) {
      let x = 0;
      for (let j = 0; j < map.height; ++j) {
        const tile = tt[i][j];
        ctx.fillStyle = this.tileColor(tile);
        ctx.fillRect(x, y, this.side, this.side);

        ctx.fillStyle = '#eee';

        if (!tile.controller.suzerain) {
          ctx.font = '12px sans-serif';
          ctx.fillText(`${tile.controller.vassalPopulation}`, x + 23, y + 25);
        }

        ctx.font = '10px sans-serif';
        ctx.fillText(`${Math.floor(this.world.populationChange(tile) * 100)}`, x + 65, y + 72);

        let xo = tile.controller.vassals.size ? 33 : 34;
        let yo = tile.controller.vassals.size ? 64 : 50;
        ctx.font = tile.controller.vassals.size ? '20px sans-serif' : '10px sans-serif';
        ctx.fillText(tile.controller.name, x + xo, y + yo);

        xo = tile.controller.vassals.size ? 33 : 35;
        yo = tile.controller.vassals.size ? 40 : 40;
        const ch = tile.controller.vassals.size ? '⍟' : '•';
        ctx.font = '14px sans-serif';
        ctx.fillText(ch, x + xo, y + yo);

        x += this.side;
      }
      y += this.side;
    }

    // Draw polity borders.
    y = 0;
    for (let i = 0; i < map.width; ++i) {
      let x = 0;
      for (let j = 0; j < map.height; ++j) {
        const tile = tt[i][j];
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 3;
        if (i == 0 || this.group(tile) != this.group(tt[i-1][j])) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + this.side, y);
          ctx.stroke();
        }
        if (i == map.height - 1) {
          ctx.beginPath();
          ctx.moveTo(x, y + this.side);
          ctx.lineTo(x + this.side, y + this.side);
          ctx.stroke();
        }
        if (j == 0 || this.group(tile) != this.group(tt[i][j-1])) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + this.side);
          ctx.stroke();
        }
        if (j == map.width - 1) {
          ctx.beginPath();
          ctx.moveTo(x + this.side, y);
          ctx.lineTo(x + this.side, y + this.side);
          ctx.stroke();
        }
        x += this.side;
      }
      y += this.side;
    }

    // Draw battles.
    for (const [attacker, target] of this.world.lastAttacks) {
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'red';

      const [x0, y0] = this.loc(this.tileOf(attacker));
      const [x1, y1] = this.loc(this.tileOf(target));

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      ctx.fillText('💥', x1 - 6, y1 + 3);
    }
  }

  loc(tile: Tile) : [number, number] {
    return [
      (tile.j + 0.5) * this.side,
      (tile.i + 0.5) * this.side,
    ];
  }

  tileOf(polity: Polity) {
    for (const tile of this.world.map.tiles.flat()) {
      if (tile.controller === polity) {
        return tile;
      }
    }
    throw new Error('polity not found');
  }

  tileColor(tile: Tile): string {
    const t = Math.min(tile.population, 5000) / 5000;
    const r = Math.floor(140 * (1 - t) + 10 * t);
    const g = Math.floor(100 * (1 - t) + 180 * t);
    const b = Math.floor(30 * (1-t) + 10 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  group(tile: Tile): Polity {
    const controller = tile.controller;
    return controller.suzerain || controller;
  }

  ngOnDestroy(): void {
    if (this.deleteWatcher) {
      this.world.removeWatcher(this.deleteWatcher);
    }
  }
}

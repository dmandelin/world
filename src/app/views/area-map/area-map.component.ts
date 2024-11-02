import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { NgFor } from '@angular/common';

import { Polity } from '../../model/polity';
import { Tile } from '../../model/tile';
import { Barley, Lentils, Dairy } from '../../model/production';
import { World } from '../../model/world';
import { argmax, clamp, sorted } from '../../model/lib';
import { mean } from '../../data/geo';

@Component({
  selector: 'area-map',
  standalone: true,
  imports: [NgFor],
  templateUrl: './area-map.component.html',
  styleUrl: './area-map.component.scss'
})
export class AreaMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('worldCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private context!: CanvasRenderingContext2D | null;
  private deleteWatcher: Function|undefined;

  messages: string[] = [];

  @Output() clickTile = new EventEmitter<Tile>();

  constructor(readonly world: World) {}

  ngAfterViewInit(): void {
    this.context = this.canvasRef.nativeElement.getContext('2d');
    this.draw();
    this.deleteWatcher = this.world.addWatcher(this.draw.bind(this));
  }

  ngOnDestroy(): void {
    this.world.removeWatcher(this.deleteWatcher);
  }

  readonly side = 80;

  click(event: MouseEvent) {
    const [x, y] = [event.clientX, event.clientY];
    const [i, j] = [Math.floor(y / this.side), Math.floor(x / this.side)];
    const target = this.world.map.tiles[i][j];
    this.clickTile.emit(target);
  }

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
        this.drawRiver(ctx, tt, i, j);

        ctx.fillStyle = '#eee';

        const tk = tile.techKit;
        ctx.font = '10px sans-serif';
        this.drawTextCentered(ctx,
          `${tk.get(Barley).s} • ${tk.get(Lentils).s} • ${tk.get(Dairy).s}`, 
          x, y + 12, this.side);

        // Draw controller name
        ctx.font = tile.controller.vassals.size ? '20px sans-serif' : '10px sans-serif';
        this.drawTextCentered(ctx, `${tile.controller.name}`, x, y + 23, this.side);

        this.drawCapital(ctx, tile.population, x + this.side / 2, y + this.side / 2);

        // Terrain
        ctx.font = '10px sans-serif';
        ctx.fillText(`${Math.floor(tile.wetFraction*100)}|${Math.floor(tile.dryLightSoilFraction*100)}`, 
          x + 3, y + 74);

        // Population change
        ctx.font = '10px sans-serif';
        this.drawTextRightAligned(ctx, `${Math.floor(tile.census.relativeChange * 100)}`, 
          x, y + 62, this.side - 4);

        // Population
        ctx.font = '10px sans-serif';
        this.drawTextRightAligned(ctx,
          `${tile.population}`, 
          x, y + 74, this.side - 4);

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

    // Draw wars.
    for (const p of this.world.polities) {
      // We'll generally double-draw them, but that's fine.
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'red';
      for (const [n, r] of p.relationships.entries()) {
        if (r.atWar) {
          const [x, y] = mean(this.loc(this.tileOf(p)), this.loc(this.tileOf(n)));
          this.drawTextCenteredOnPoint(ctx, '💥', x, y);
        }
      }
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
    const v = tile.capacity / tile.population;
    const a = clamp((v - 0.75) * 2, 0, 1);
    if (tile.isRiver) {
      const r = Math.floor(90 * clamp(1 - a, 0.5, 1));
      const g = Math.floor(120 * a);
      const b = 0;
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const r = Math.floor(90 * (1 - a) + 150 * a);
      const g = Math.floor(150 * a);
      const b = 0;
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  drawRiver(ctx: CanvasRenderingContext2D, tt: Tile[][], i: number, j: number) {
    if (!tt[i][j].isRiver) return;
    const [xc, yc] = this.riverCenter(tt, i, j);

    for (let ii = i - 1; ii <= i + 1; ++ii) {
      for (let jj = j - 1; jj <= j + 1; ++jj) {
        if (ii == i && jj == j || j < 0 || j >= tt[i].length) continue;
        if ((ii < 0 || ii >= tt.length) && j == jj || (ii >= 0 && ii < tt.length) && tt[ii][jj].isRiver) {
          const [x, y] = this.riverCenter(tt, ii, jj);
          ctx.beginPath();
          ctx.strokeStyle = '#80a0d0';
          ctx.lineWidth = 4;
          ctx.moveTo(xc, yc);
          ctx.lineTo(x, y);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = '#004060';
          ctx.lineWidth = 3;
          ctx.moveTo(xc, yc);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }
    }
  }

  riverCenter(tt: Tile[][], i: number, j: number): [number, number] {
    const xc = j * this.side + this.side / 2 + (j <= 1 ? -this.side / 8 : j >= tt.length - 2 ? this.side / 8 : 0);
    const yc = i * this.side + this.side / 2;
    return [xc, yc];
  }

  group(tile: Tile): Polity {
    const controller = tile.controller;
    return controller.suzerain || controller;
  }

  cultureTier(culture: number, maxCulture: number): string {
    const l = Math.ceil(Math.log2(maxCulture) - Math.log2(culture));
    const tiers = ['*', 'S', 'A', 'B', 'C', 'D', 'E', 'F'];
    return l < tiers.length ? tiers[l] : tiers[tiers.length-1];
  }

  private drawCapital(ctx: CanvasRenderingContext2D, population: number, x: number, y: number) {
    const s = Math.sqrt(population / 10000) * this.side * 0.08;
    ctx.fillStyle = '#eee';
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.strokeStyle = '#ccc';
    ctx.strokeRect(x - s / 2, y - s / 2, s, s);
  }

  private drawTextCenteredOnPoint(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
    const textMetrics = ctx.measureText(text);
    ctx.fillText(text, x - textMetrics.width / 2, y + 3);
  }
  
  private drawTextCentered(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
    const textMetrics = ctx.measureText(text);
    ctx.fillText(text, x + width / 2 - textMetrics.width / 2, y);
  }

  private drawTextRightAligned(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, x + width - textWidth, y);
  }
}

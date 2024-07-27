import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { NgFor } from '@angular/common';

import { Polity } from '../model/polity';
import { Tile } from '../model/tile';
import { Barley, Lentils, Dairy } from '../model/production';
import { World } from '../model/world';
import { argmax, sorted } from '../model/lib';

@Component({
  selector: 'app-map-canvas',
  standalone: true,
  imports: [NgFor],
  templateUrl: './map-canvas.component.html',
  styleUrl: './map-canvas.component.scss'
})
export class MapCanvasComponent implements AfterViewInit, OnDestroy {
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

  culturalInfluencesDisplay(tile: Tile): string {
    return sorted([...tile.culturalInfluences.entries()], (tc: [Tile, number]) => -tc[1])
      .filter(tc => tc[1] >= 0.05)
      .map(tc => `${Math.round(tc[1]*100)}%: ${tc[0].controller.name}`)
      .join(', ');
  }

  draw(): void {
    const ctx = this.context;
    if (!ctx) return;

    const map = this.world.map;
    const tt = map.tiles;
    const maxCulture = argmax(map.tiles.flat(), t => t.culture)[1];

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
        this.drawTextRightAligned(ctx, `${Math.floor(this.world.populationChange(tile) * 100)}`, 
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

    // Draw trade relationships.
    for (const t of this.world.map.tiles.flat()) {
      for (const u of t.tradePartners) {
        ctx.strokeStyle = 'blue';
        ctx.fillStyle = 'blue';
  
        const [x0, y0] = this.loc(t);
        const [x1, y1] = this.loc(u);
  
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }
    
    // Draw battles.
    for (const [attacker, target] of this.world.lastAttacks) {
      ctx.strokeStyle = 'red';
      ctx.fillStyle = 'red';

      let [x0, y0] = this.loc(this.tileOf(attacker));
      let [x1, y1] = this.loc(this.tileOf(target));
      let [dx, dy] = [x1 - x0, y1 - y0];
      let ds = Math.sqrt(dx * dx + dy * dy);
      let [xd, yd] = [dx / ds, dy / ds];
      
      x0 += xd * 20;
      y0 += yd * 20;

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
    const t = Math.max(0, Math.min(tile.population, 5000) / 5000);
    const r = Math.floor(140 * (1 - t) + 10 * t);
    const g = Math.floor(100 * (1 - t) + 180 * t);
    const b = Math.floor(30 * (1-t) + 10 * t);
    return `rgb(${r}, ${g}, ${b})`;
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

  private drawTextCentered(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, x + (width - textWidth) / 2, y);
  }

  private drawTextRightAligned(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, x + width - textWidth, y);
  }
}

import { Component } from '@angular/core';
import { TilePanelBase } from '../util/tile-panel-base';
import { Tile } from '../model/tile';
import { NgFor, NgIf } from '@angular/common';
import { TilePopGraphsComponent } from '../tile-pop-graphs/tile-pop-graphs.component';
import { complexity, freedom, flourishing, complexities, freedoms, PerFactor } from '../model/ways';
import { TileWaysGraphsComponent } from '../tile-ways-graphs/tile-ways-graphs.component';

@Component({
  selector: 'app-tile-summary-panel',
  standalone: true,
  imports: [NgIf, NgFor, TilePopGraphsComponent, TileWaysGraphsComponent],
  templateUrl: './tile-summary-panel.component.html',
  styleUrl: './tile-summary-panel.component.scss'
})
export class TileSummaryPanelComponent extends TilePanelBase {
  get flourishing(): string {
    return this.tile ? (flourishing(this.tile) * 100).toFixed(0) : '';
  }

  get complexity(): string {
    return this.tile ? complexity(this.tile).toFixed(0) : '';
  }

  get freedom(): string {
    return this.tile ? freedom(this.tile).toFixed(0) : '';
  }

  get sources(): Array<{name: string, c: number, f: number}> {
    if (!this.tile) return [];
    const cs = complexities(this.tile);
    const fs = freedoms(this.tile);
    return Object.keys(cs).map(name => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      c: cs[name as keyof PerFactor], 
      f: fs[name as keyof PerFactor]}));
  }

  formatYear(year: number|undefined): string {
    return year === undefined ? '' : this.wvm.world.yearDisplay(year);
  }

  percent(n: number|undefined, places = 0): string {
    return n === undefined ? '' : (n * 100).toFixed(places) + '%';
  }

  spercent(n: number|undefined, places = 0): string {
    return n === undefined ? '' : (n < 0 ? '' : '+') + this.percent(n, places);
  }
}

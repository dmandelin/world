import { Component } from '@angular/core';
import { TilePanelBase } from '../util/tile-panel-base';
import { Tile } from '../model/tile';
import { NgFor, NgIf } from '@angular/common';
import { TilePopGraphsComponent } from '../tile-pop-graphs/tile-pop-graphs.component';
import { complexity, freedom, flourishing } from '../model/ways';
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

  get complexity(): number {
    return this.tile ? complexity(this.tile) : 0;
  }

  get freedom(): number {
    return this.tile ? freedom(this.tile) : 0;
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

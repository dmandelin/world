import { Component } from '@angular/core';
import { TilePanelBase } from '../util/tile-panel-base';
import { Tile } from '../model/tile';
import { NgFor, NgIf } from '@angular/common';
import { TilePopGraphsComponent } from '../tile-pop-graphs/tile-pop-graphs.component';

@Component({
  selector: 'app-tile-summary-panel',
  standalone: true,
  imports: [NgIf, NgFor, TilePopGraphsComponent],
  templateUrl: './tile-summary-panel.component.html',
  styleUrl: './tile-summary-panel.component.scss'
})
export class TileSummaryPanelComponent extends TilePanelBase {
  get consumptionRatio(): number {
    return (this.tile?.capacity ?? 0) / (this.tile?.population ?? 1); 
  }

  get populationChange(): string {
    const v = (this.tile?.population ?? 0) - (this.tile?.populationSeries?.prevValue ?? 0);
    return (v < 0 ? '' : '+') + v.toFixed(0);
  }

  formatYear(year: number|undefined): string {
    return year === undefined ? '' : this.wvm.world.yearDisplay(year);
  }

  percent(n: number|undefined): string {
    return n === undefined ? '' : (n * 100).toFixed(0) + '%';
  }

  spercent(n: number|undefined): string {
    return n === undefined ? '' : (n < 0 ? '' : '+') + this.percent(n);
  }
}

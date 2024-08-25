import { Component } from '@angular/core';
import { TilePanelBase } from '../util/tile-panel-base';
import { Tile } from '../model/tile';
import { NgFor, NgIf } from '@angular/common';
import { TilePopGraphsComponent } from '../tile-pop-graphs/tile-pop-graphs.component';

@Component({
  selector: 'app-tile-population-panel',
  standalone: true,
  imports: [NgIf, NgFor, TilePopGraphsComponent],
  templateUrl: './tile-population-panel.component.html',
  styleUrl: './tile-population-panel.component.scss'
})
export class TilePopulationPanelComponent extends TilePanelBase {
  get consumptionRatio(): number {
    return (this.tile?.capacity ?? 0) / (this.tile?.population ?? 1); 
  }

  get religiousPopulationGrowthFactor() {
    return (this.tile?.bonus('populationGrowthFactor') ?? 1) - 1;
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

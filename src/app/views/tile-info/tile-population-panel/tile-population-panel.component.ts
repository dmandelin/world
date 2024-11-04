import { Component } from '@angular/core';
import { TilePanelBase } from '../tile-panel-base';
import { NgFor, NgIf } from '@angular/common';
import { TilePopGraphsComponent } from '../tile-pop-graphs/tile-pop-graphs.component';
import { flourishing } from '../../../model/ways';
import { Pop } from '../../../model/population';

@Component({
  selector: 'app-tile-population-panel',
  standalone: true,
  imports: [NgIf, NgFor, TilePopGraphsComponent],
  templateUrl: './tile-population-panel.component.html',
  styleUrl: './tile-population-panel.component.scss'
})
export class TilePopulationPanelComponent extends TilePanelBase {
  consumptionRatio(pop: Pop): number {
    return pop.consumption2.nutrition.value / pop.n; 
  }

  flourishing(pop: Pop): string {
    return this.tile ? (flourishing(pop) * 100).toFixed(0) : '';
  }

  get religiousPopulationGrowthFactor() {
    return this.tile?.mods.popGrowth.rel;
  }

  get relationRows() {
    if (!this.tile) return [];
    return this.tile.pop.pops.flatMap(pop => [...pop.attitudes.values()]);
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

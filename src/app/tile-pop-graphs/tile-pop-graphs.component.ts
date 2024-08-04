import { Component } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { TilePanelBase } from '../util/tile-panel-base';
import { ChartConfiguration } from 'chart.js';
import { Tile } from '../model/tile';
import { TileGraphBase } from '../util/tile-graph-base';

@Component({
  selector: 'app-tile-pop-graphs',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './tile-pop-graphs.component.html',
  styleUrl: './tile-pop-graphs.component.scss'
})
export class TilePopGraphsComponent extends TileGraphBase {
  public get lineChartData(): ChartConfiguration<'line'>['data'] {
      return {
        labels: this.wvm.selectedTile?.populationSeries.years ?? [],
        datasets: [
          this.dataset('Capacity', 'green', t => t.capacitySeries.values),
          this.dataset('Population', 'black', t => t.populationSeries.values),
          this.dataset('Losses', 'red', t => t.raidEffectSeries.values.map(e => -e.deltaPopulation)),
        ]
      };
    }
}

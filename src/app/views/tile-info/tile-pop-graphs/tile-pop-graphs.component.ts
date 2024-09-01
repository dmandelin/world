import { Component } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { TilePanelBase } from '../tile-panel-base';
import { ChartConfiguration } from 'chart.js';
import { Tile } from '../../../model/tile';
import { TileGraphBase } from '../tile-graph-base';

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
        labels: this.wvm.selectedTile?.censusSeries.years ?? [],
        datasets: [
          this.dataset('Capacity', 'green', t => t.capacitySeries.values),
          this.dataset('Population', 'black', t => t.censusSeries.values.map(c => c.n)),
          this.dataset('Losses', 'red', t => t.censusSeries.values.map(c => c.raidingLosses)),
        ]
      };
    }
}

import { Component } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { TileGraphBase } from '../util/tile-graph-base';

@Component({
  selector: 'app-tile-ways-graphs',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './tile-ways-graphs.component.html',
  styleUrl: './tile-ways-graphs.component.scss'
})
export class TileWaysGraphsComponent extends TileGraphBase {
  public get lineChartData(): ChartConfiguration<'line'>['data'] {
      return {
        labels: this.wvm.selectedTile?.censusSeries.years ?? [],
        datasets: [
          //this.dataset('𒌋', 'green', t => t.censusSeries.values.map(c => c.n)),
          this.dataset('𒂍𒃲', 'red', t => t.flourishingSeries.values.map(f => 100 * f)),
          this.dataset('𒍑𒋼', 'blue', t => t.complexitySeries.values),
          this.dataset('𒄑𒋺𒋛', 'grey', t => t.freedomSeries.values),
        ]
      };
    }
}

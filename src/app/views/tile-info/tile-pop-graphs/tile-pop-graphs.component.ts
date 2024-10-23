import { Component } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
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
          this.dataset('Largest Settlement', 'purple', t => t.censusSeries.values.map(c => c.largestSettlementSize)),
          this.dataset('Losses', 'red', t => t.censusSeries.values.map(c => c.raidingLosses)),
          this.dataset('Settlements', 'blue', t => t.censusSeries.values.map(c => c.settlementCount), 
            'y2', 0),
        ]
      };
    }

    public override lineChartOptions: ChartOptions<'line'> = {
      scales: {
        y: {
          type: 'linear',
          position: 'left',
        },
        y2: {
          type: 'linear',
          position: 'right',
          ticks: {
            stepSize: 1,
            callback: (value, index, values) => {
              return typeof value === 'number' ? value.toFixed(0) : value;
            }
          }
        }
      }
    };
}

import { Component } from '@angular/core';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import { Barley, Lentils, Dairy, PerProduce } from '../../../model/production';
import { Tile } from '../../../model/tile';
import { TileGraphBase } from '../tile-graph-base';

@Component({
  selector: 'app-economy-graphs',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './economy-graphs.component.html',
  styleUrl: './economy-graphs.component.scss'
})
export class EconomyGraphsComponent extends TileGraphBase {
  public get lineChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.wvm.selectedTile?.productionSeries.years ?? [],
      datasets: [
        this.productionDataset('Barley', 'brown', pp => pp.get(Barley)),
        this.productionDataset('Lentils', 'green', pp => pp.get(Lentils)),
        this.productionDataset('Dairy', 'yellow', pp => pp.get(Dairy)),
        this.productionDataset('Total', 'blue', pp => pp.total),

        this.dataset('Capacity', 'red', t => t.capacitySeries.values),
        this.dataset('Population', 'black', t => t.censusSeries.values.map(c => c.n)),
      ]
    };
  }

  private productionDataset(label: string, color: string, fun: (pp: PerProduce) => number) {
    return this.dataset(label, color, t => t.productionSeries.values.map(fun));

  }
}

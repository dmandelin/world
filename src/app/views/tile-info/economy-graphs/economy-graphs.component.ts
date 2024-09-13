import { Component } from '@angular/core';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import { Barley, Lentils, Dairy, Product } from '../../../model/production';
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
        this.productionDataset('Barley', 'brown', pp => pp.get(Barley) || 0),
        this.productionDataset('Lentils', 'green', pp => pp.get(Lentils) || 0),
        this.productionDataset('Dairy', 'yellow', pp => pp.get(Dairy) || 0),

        this.dataset('Capacity', 'red', t => t.capacitySeries.values),
        this.dataset('Population', 'black', t => t.censusSeries.values.map(c => c.n)),
      ]
    };
  }

  private productionDataset(label: string, color: string, fun: (pp: Map<Product, number>) => number) {
    return this.dataset(label, color, t => t.productionSeries.values.map(fun));

  }
}

import { Component } from '@angular/core';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import { WorldViewModel } from '../model/world';
import { Barley, Lentils, Dairy, PerProduce } from '../model/production';

@Component({
  selector: 'app-economy-graphs',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './economy-graphs.component.html',
  styleUrl: './economy-graphs.component.scss'
})
export class EconomyGraphsComponent {
  constructor(private readonly wvm: WorldViewModel) { }

  public get lineChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.wvm.selectedTile?.productionSeries.years ?? [],
      datasets: [
        this.productionDataset('Barley', 'brown', pp => pp.get(Barley)),
        this.productionDataset('Lentils', 'olive', pp => pp.get(Lentils)),
        this.productionDataset('Dairy', 'blue', pp => pp.get(Dairy)),
        this.productionDataset('Total', 'black', pp => pp.total),
      ]
    };
  }

  private productionDataset(label: string, color: string, fun: (pp: PerProduce) => number) {
    return {
      data: this.wvm.selectedTile?.productionSeries.values.map(fun) ?? [],
      label: label,
      tension: 0.5,
      borderColor: color,
    };
  }

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: false
  };

  public lineChartLegend = true;
}

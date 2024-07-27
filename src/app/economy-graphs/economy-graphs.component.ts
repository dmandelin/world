import { Component } from '@angular/core';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import { WorldViewModel } from '../model/world';

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
        {
          data: this.wvm.selectedTile?.productionSeries.values.map(pp => pp.total) ?? [],
          label: 'Total Production',
          fill: true,
          tension: 0.5,
          borderColor: 'black',
          backgroundColor: 'rgba(255,0,0,0.3)'
        }
      ]
    };
  }
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: false
  };
  public lineChartLegend = true;
}

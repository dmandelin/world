import { Component } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { TilePanelBase } from '../util/tile-panel-base';
import { ChartConfiguration } from 'chart.js';
import { Tile } from '../model/tile';
import { TileGraphBase } from '../util/tile-graph-base';

@Component({
  selector: 'app-tile-politics-graphs',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './tile-politics-graphs.component.html',
  styleUrl: './tile-politics-graphs.component.scss'
})
export class TilePoliticsGraphsComponent extends TileGraphBase {
  public get lineChartData(): ChartConfiguration<'line'>['data'] {
      return {
        labels: this.tile?.censusSeries.years ?? [],
        datasets: this.tile?.controller.actors.map((actor =>
          this.dataset(actor.name, actor.color, _ => actor.influenceSeries.values)
        )) ?? [],
      };
    }
}

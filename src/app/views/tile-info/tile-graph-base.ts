import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { Tile } from '../../model/tile';
import { TilePanelBase } from './tile-panel-base';

export abstract class TileGraphBase extends TilePanelBase {
  public abstract get lineChartData(): ChartConfiguration<'line'>['data'];

  protected get yearLabels() {
    return this.tile?.productionSeries.years ?? [];
  }

  protected dataset(
    label: string, 
    color: string, fun: (t: Tile) => number[], 
    yAxisID: string = 'y',
    tension: number = 0.5): ChartConfiguration<'line'>['data']['datasets'][0] 
  {
    return {
      data: this.tile ? fun(this.tile) : [],
      label: label,
      tension: tension,
      borderColor: color,
      yAxisID,
    };
  }

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: false
  };

  public lineChartLegend = true;
}

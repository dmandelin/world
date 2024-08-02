import { Component } from '@angular/core';
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";
import { BaseChartDirective } from 'ng2-charts';
import { WorldViewModel } from '../model/world';
import { Barley, Lentils, Dairy, PerProduce } from '../model/production';
import { Tile } from '../model/tile';
import { TilePanelBase } from './tile-panel-base';

export abstract class TileGraphBase extends TilePanelBase {
  public abstract get lineChartData(): ChartConfiguration<'line'>['data'];

  protected get yearLabels() {
    return this.tile?.productionSeries.years ?? [];
  }

  protected dataset(label: string, color: string, fun: (t: Tile) => number[]) {
    return {
      data: this.tile ? fun(this.tile) : [],
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

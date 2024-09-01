import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { TilePanelBase } from '../tile-panel-base';
import { TilePoliticsGraphsComponent } from "../tile-politics-graphs/tile-politics-graphs.component";

@Component({
  selector: 'app-tile-politics-panel',
  standalone: true,
  imports: [NgFor, TilePoliticsGraphsComponent],
  templateUrl: './tile-politics-panel.component.html',
  styleUrl: './tile-politics-panel.component.scss'
})
export class TilePoliticsPanelComponent extends TilePanelBase {
  floor(n: number|undefined): number { return n === undefined ? 0 : Math.floor(n); }
  round(n: number|undefined, p: number): string { return n === undefined ? '0' : n.toFixed(p); }
  percent(n: number): string { return `${Math.floor(n * 100)}%`; }
}

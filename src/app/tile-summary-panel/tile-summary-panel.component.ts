import { Component } from '@angular/core';
import { TilePanelBase } from '../util/tile-panel-base';
import { Tile } from '../model/tile';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-tile-summary-panel',
  standalone: true,
  imports: [ NgFor],
  templateUrl: './tile-summary-panel.component.html',
  styleUrl: './tile-summary-panel.component.scss'
})
export class TileSummaryPanelComponent extends TilePanelBase {
}

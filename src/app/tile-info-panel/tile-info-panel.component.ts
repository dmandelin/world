import { Component } from '@angular/core';
import { TabPanelComponent } from '../tab-panel/tab-panel.component';
import { TabPanelItemComponent } from '../tab-panel-item/tab-panel-item.component';
import { TileEconomyPanelComponent } from '../tile-economy-panel/tile-economy-panel.component';
import { Tile } from '../model/tile';
import { NgIf } from '@angular/common';
import { WorldViewModel } from '../model/world';
import { TileSummaryPanelComponent } from '../tile-summary-panel/tile-summary-panel.component';

@Component({
  selector: 'app-tile-info-panel',
  standalone: true,
  imports: [
    NgIf,
    TabPanelComponent,
    TabPanelItemComponent,
    TileEconomyPanelComponent,
    TileSummaryPanelComponent
  ],
  templateUrl: './tile-info-panel.component.html',
  styleUrl: './tile-info-panel.component.scss'
})
export class TileInfoPanelComponent {
  constructor(readonly wvm: WorldViewModel) {}
}

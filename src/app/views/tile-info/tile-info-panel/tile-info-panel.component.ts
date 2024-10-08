import { Component } from '@angular/core';
import { TabPanelComponent } from '../tab-panel/tab-panel.component';
import { TabPanelItemComponent } from '../tab-panel-item/tab-panel-item.component';
import { TileEconomyPanelComponent } from '../tile-economy-panel/tile-economy-panel.component';
import { NgIf } from '@angular/common';
import { WorldViewModel } from '../../../model/world';
import { EconomyGraphsComponent } from '../economy-graphs/economy-graphs.component';
import { TileIdeologyPanelComponent } from '../tile-ideology-panel/tile-ideology-panel.component';
import { TileSummaryPanelComponent } from '../tile-summary-panel/tile-summary-panel.component';
import { TilePopulationPanelComponent } from '../tile-population-panel/tile-population-panel.component';
import { TilePoliticsPanelComponent } from '../tile-politics-panel/tile-politics-panel.component';
import { TileMilitaryPanelComponent } from '../tile-military-panel/tile-military-panel.component';

@Component({
  selector: 'app-tile-info-panel',
  standalone: true,
  imports: [
    NgIf,
    EconomyGraphsComponent,
    TabPanelComponent,
    TabPanelItemComponent,
    TileEconomyPanelComponent,
    TileIdeologyPanelComponent,
    TileMilitaryPanelComponent,
    TilePoliticsPanelComponent,
    TilePopulationPanelComponent,
    TileSummaryPanelComponent,
  ],
  templateUrl: './tile-info-panel.component.html',
  styleUrl: './tile-info-panel.component.scss'
})
export class TileInfoPanelComponent {
  constructor(readonly wvm: WorldViewModel) {}
}

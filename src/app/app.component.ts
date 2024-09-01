import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AreaMapComponent } from './views/area-map/area-map.component';
import { WorldInfoPanelComponent } from './views/world/world-info-panel/world-info-panel.component';
import { WorldLogPanelComponent } from "./views/world/world-log-panel/world-log-panel.component";
import { TileInfoPanelComponent } from './views/tile-info/tile-info-panel/tile-info-panel.component';
import { WorldTurnPanelComponent } from './views/world/world-turn-panel/world-turn-panel.component';
import { Tile } from './model/tile';
import { WorldViewModel } from './model/world';

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [
      RouterOutlet, 
      AreaMapComponent, 
      TileInfoPanelComponent,
      WorldInfoPanelComponent, 
      WorldLogPanelComponent,
      WorldTurnPanelComponent,
    ],
})
export class AppComponent {
  @ViewChild(TileInfoPanelComponent) tileInfoPanel!: TileInfoPanelComponent;

  title = 'world';

  constructor(readonly wvm: WorldViewModel) {}

  public clickTile(tile: Tile) {
    this.wvm.selectedTile = tile;
  }  
}

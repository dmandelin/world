import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapCanvasComponent } from './map-canvas/map-canvas.component';
import { WorldInfoPanelComponent } from './world-info-panel/world-info-panel.component';
import { WorldLogPanelComponent } from "./world-log-panel/world-log-panel.component";
import { TileInfoPanelComponent } from './tile-info-panel/tile-info-panel.component';
import { Tile } from './model/tile';
import { WorldViewModel } from './model/world';

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [
      RouterOutlet, 
      MapCanvasComponent, 
      TileInfoPanelComponent,
      WorldInfoPanelComponent, 
      WorldLogPanelComponent,
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

import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapCanvasComponent } from './map-canvas/map-canvas.component';
import { MapComponent } from './map/map.component';
import { MapInfoPanelComponent } from './map-info-panel/map-info-panel.component';
import { WorldInfoPanelComponent } from './world-info-panel/world-info-panel.component';
import { WorldLogPanelComponent } from "./world-log-panel/world-log-panel.component";
import {Tile} from './world';

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [
      RouterOutlet, 
      MapCanvasComponent, 
      MapComponent, 
      MapInfoPanelComponent, 
      WorldInfoPanelComponent, 
      WorldLogPanelComponent,
    ],
})
export class AppComponent {
  @ViewChild('mapInfoPanel') mapInfoPanel!: MapInfoPanelComponent;

  title = 'world';

  public clickTile(tile: Tile) {
    this.mapInfoPanel.showTile(tile);
  }  
}

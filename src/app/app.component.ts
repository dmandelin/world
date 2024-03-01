import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MapCanvasComponent } from './map-canvas/map-canvas.component';
import { MapComponent } from './map/map.component';
import { MapInfoPanelComponent } from './map-info-panel/map-info-panel.component';
import { WorldLogPanelComponent } from "./world-log-panel/world-log-panel.component";

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [RouterOutlet, MapCanvasComponent, MapComponent, MapInfoPanelComponent, WorldLogPanelComponent]
})
export class AppComponent {
  title = 'world';
}

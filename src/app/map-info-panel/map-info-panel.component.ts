import { Component } from '@angular/core';
import { World } from '../world';

@Component({
  selector: 'app-map-info-panel',
  standalone: true,
  imports: [],
  templateUrl: './map-info-panel.component.html',
  styleUrl: './map-info-panel.component.scss'
})
export class MapInfoPanelComponent {
  constructor(readonly world: World) {
    console.log(world.year);
  }
}

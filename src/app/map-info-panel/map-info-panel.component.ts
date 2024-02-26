import { Component } from '@angular/core';
import { World, Polity } from '../world';
import { NgFor, NgStyle } from '@angular/common';

@Component({
  selector: 'app-map-info-panel',
  standalone: true,
  imports: [NgFor, NgStyle],
  templateUrl: './map-info-panel.component.html',
  styleUrl: './map-info-panel.component.scss'
})
export class MapInfoPanelComponent {
  constructor(readonly world: World) {
  }

  nextTurn() {
    this.world.nextTurn();
  }

  vassalsDisplay(p: Polity) {
    return p.vassals.size
      ? `>${[...p.vassals].map(v => v.name)}`
      : '';
  }
}

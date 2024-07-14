import { Component } from '@angular/core';
import { World } from '../model/world';

@Component({
  selector: 'app-world-turn-panel',
  standalone: true,
  imports: [],
  templateUrl: './world-turn-panel.component.html',
  styleUrl: './world-turn-panel.component.scss'
})
export class WorldTurnPanelComponent {
  constructor(readonly world: World) {
  }

  floor(n: number): number { return Math.floor(n); }

  advance() {
    this.world.advance();
  }
}

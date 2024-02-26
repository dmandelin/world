import { Component } from '@angular/core';
import { World } from '../world';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-world-log-panel',
  standalone: true,
  imports: [NgFor],
  templateUrl: './world-log-panel.component.html',
  styleUrl: './world-log-panel.component.scss'
})
export class WorldLogPanelComponent {
  constructor(readonly world: World) {
  }
}

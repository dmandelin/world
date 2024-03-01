import { Component } from '@angular/core';
import { World, Tile } from '../world';
import { NgFor, NgStyle } from '@angular/common';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [NgFor, NgStyle],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent {
  constructor(readonly world: World) {
  }

  popDisplay(tile: Tile): string {
    return `${Math.floor(tile.population/100)}/${Math.floor(tile.capacity/100)}`;
  }
}

import { Component } from '@angular/core';
import { Polity, World, Tile } from '../world';
import { NgClass, NgFor, NgStyle } from '@angular/common';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [NgClass, NgFor, NgStyle],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent {
  constructor(readonly world: World) {
  }

  popDisplay(tile: Tile): string {
    return `${Math.floor(tile.population/100)}/${Math.floor(tile.capacity/100)}`;
  }

  tileClasses(i: number, j: number): {[key: string]: boolean} {
    const tt = this.world.map.tiles;
    const ans = {
      'tbt': i == 0 || this.group(tt[i-i][j]) != this.group(tt[i][j]),
      'tbb': i == this.world.map.height - 1,
      'tbl': j == 0 || this.group(tt[i][j-1]) != this.group(tt[i][j]),
      'tbr': j == this.world.map.width - 1,
    };
    console.log(i, j, ans);
    return ans;
  }

  group(tile: Tile): Polity {
    const controller = tile.controller;
    return controller.suzerain || controller;
  }
}

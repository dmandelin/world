import { Component } from '@angular/core';
import { World, Polity, AllTerrainTypes, ProduceInfo, Tile } from '../world';
import { NgIf, NgFor, NgStyle } from '@angular/common';

@Component({
  selector: 'app-map-info-panel',
  standalone: true,
  imports: [NgIf, NgFor, NgStyle],
  templateUrl: './map-info-panel.component.html',
  styleUrl: './map-info-panel.component.scss'
})
export class MapInfoPanelComponent {
  readonly products = ProduceInfo.all;
  readonly terrainTypes = AllTerrainTypes;

  tile: Tile|undefined;

  constructor(readonly world: World) {
  }

  showTile(tile: Tile) {
    this.tile = tile;
  } 

  totalProduction(p: ProduceInfo): number {
    if (!this.tile) return 0;
    return this.tile.production[p.produce];
  }

  floor(n: number): number { return Math.floor(n); }
  percent(n: number): string { return `${Math.floor(n * 100)}%`; }
}

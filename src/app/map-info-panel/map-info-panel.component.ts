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

  totalProduction: number|undefined;
  nutritionalQuality: number|undefined;
  capacity: number|undefined;

  constructor(readonly world: World) {
  }

  showTile(tile: Tile) {
    this.tile = tile;

    const production = this.tile.production;
    this.totalProduction = this.products.reduce((total, p) => total + production[p.produce], 0);
    this.capacity = this.tile.capacity;
    this.nutritionalQuality = this.capacity / this.totalProduction;
  } 

  production(p: ProduceInfo): number {
    if (!this.tile) return 0;
    return this.tile.production[p.produce];
  }

  floor(n: number|undefined): number { return n === undefined ? 0 : Math.floor(n); }
  round(n: number|undefined, p: number): number { return n === undefined ? 0 : Math.round(n / p) * p; }
  percent(n: number): string { return `${Math.floor(n * 100)}%`; }
}

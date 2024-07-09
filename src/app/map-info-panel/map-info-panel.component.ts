import { Component } from '@angular/core';
import { NgIf, NgFor, NgStyle } from '@angular/common';

import { Allocation, AllTerrainTypes, Product, Products, PerProduce, Terrain } from '../model/production';
import { World } from '../model/world';
import { Tile } from '../model/tile';

@Component({
  selector: 'app-map-info-panel',
  standalone: true,
  imports: [NgIf, NgFor, NgStyle],
  templateUrl: './map-info-panel.component.html',
  styleUrl: './map-info-panel.component.scss'
})
export class MapInfoPanelComponent {
  private deleteWatcher: Function|undefined;

  readonly products = Products;
  readonly terrainTypes = AllTerrainTypes;

  tile: Tile|undefined;

  allocs: readonly Allocation[] = [];
  totalProduction: number|undefined;
  nutritionalQuality: number|undefined;
  capacity: number|undefined;
  marginalCapacity: PerProduce = new PerProduce();
  population: number|undefined;

  constructor(readonly world: World) {
  }

  ngAfterViewInit(): void {
    this.deleteWatcher = this.world.addWatcher(this.refresh.bind(this));
  }

  ngOnDestroy(): void {
    this.world.removeWatcher(this.deleteWatcher);
  }

  showTile(tile: Tile) {
    this.tile = tile;
    this.refresh();

    this.tile?.settlements();
  }

  refresh() {
    if (!this.tile) return;

    this.allocs = this.tile.allocs;
    const production = this.tile.production;
    this.totalProduction = this.products.reduce((total, p) => total + production.Total.get(p), 0);
    this.capacity = this.tile.capacity;
    this.marginalCapacity = this.tile.marginalCapacity;
    this.nutritionalQuality = this.capacity / this.totalProduction;
    this.population = this.tile.population;
  }

  production(p: Product, t?: Terrain): number {
    if (!this.tile) return 0;
    if (!t) return this.tile.production.Total.get(p);
    return this.tile.production[t.name].get(p);
  }

  ratioize() {
    this.tile?.ratioizeLabor();
    this.refresh();
  }

  equalize() {
    this.tile?.equalizeLabor();
    this.refresh();
  }

  optimize() {
    this.tile?.optimizeLabor();
    this.refresh();
  }

  optimizeLaborOneStep() {
    this.tile?.optimizeLaborOneStep();
    this.refresh();
  }

  updateTradeLinks() {
    this.tile?.updateMarket();
    this.refresh();
  }

  floor(n: number|undefined): number { return n === undefined ? 0 : Math.floor(n); }
  round(n: number|undefined, p: number): string { return n === undefined ? '0' : n.toFixed(p); }
  percent(n: number): string { return `${Math.floor(n * 100)}%`; }
}

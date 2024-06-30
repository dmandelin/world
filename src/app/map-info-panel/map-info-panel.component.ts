import { Component } from '@angular/core';
import { World, Polity, AllTerrainTypes, Allocation, Produce, ProduceInfo, Terrain, Tile } from '../world';
import { NgIf, NgFor, NgStyle } from '@angular/common';

@Component({
  selector: 'app-map-info-panel',
  standalone: true,
  imports: [NgIf, NgFor, NgStyle],
  templateUrl: './map-info-panel.component.html',
  styleUrl: './map-info-panel.component.scss'
})
export class MapInfoPanelComponent {
  private deleteWatcher: Function|undefined;

  readonly products = ProduceInfo.all;
  readonly terrainTypes = AllTerrainTypes;

  tile: Tile|undefined;

  allocs: readonly Allocation[] = [];
  totalProduction: number|undefined;
  nutritionalQuality: number|undefined;
  capacity: number|undefined;
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
  }

  refresh() {
    if (!this.tile) return;

    this.allocs = this.tile.allocs;
    const production = this.tile.production;
    this.totalProduction = this.products.reduce((total, p) => total + production.Total[p.produce], 0);
    this.capacity = this.tile.capacity;
    this.nutritionalQuality = this.capacity / this.totalProduction;
    this.population = this.tile.population;
  }

  production(p: ProduceInfo, t?: Terrain): number {
    if (!this.tile) return 0;
    if (!t) return this.tile.production.Total[p.produce];
    return this.tile.production[t.name][p.produce];
  }

  analyzeProduction() {
    this.tile?.analyzeProduction();
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

  productName(p: Produce): string {
    return ProduceInfo.getName(p);
  }

  floor(n: number|undefined): number { return n === undefined ? 0 : Math.floor(n); }
  round(n: number|undefined, p: number): number { return n === undefined ? 0 : Math.round(n / p) * p; }
  percent(n: number): string { return `${Math.floor(n * 100)}%`; }
}

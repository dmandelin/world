import { Component } from '@angular/core';
import { NgIf, NgFor, NgStyle } from '@angular/common';
import { Allocation, AllTerrainTypes, Product, Products, PerProduce, Terrain, marginalProductsOfLabor, marginalProductsOfLand, marginalUtilitiesOfLabor, marginalUtilitiesOfLand } from '../../../model/production';
import { TilePanelBase } from '../tile-panel-base';
import { marginalNutrition } from '../../../model/utility';

@Component({
  selector: 'app-tile-economy-panel',
  standalone: true,
  imports: [NgIf, NgFor, NgStyle],
  templateUrl: './tile-economy-panel.component.html',
  styleUrl: './tile-economy-panel.component.scss'
})
export class TileEconomyPanelComponent extends TilePanelBase {

  readonly products = Products;
  readonly terrainTypes = AllTerrainTypes;

  allocs: readonly Allocation[] = [];
  totalProduction: number|undefined;
  nutritionalQuality: number|undefined;
  capacity: number|undefined;
  preTradeCapacity: number|undefined;
  marginalCapacity: PerProduce = new PerProduce();
  population: number|undefined;

  marginalProductsOfLabor: Map<Allocation, number> | undefined;
  marginalProductsOfLand: Map<Allocation, number> | undefined;
  marginalUtilitiesOfLabor: Map<Allocation, number> | undefined;
  marginalUtilitiesOfLand: Map<Allocation, number> | undefined;

  override update() {
    if (!this.tile) return;

    this.allocs = this.tile.allocs;
    const production = this.tile.production;
    this.marginalProductsOfLabor = marginalProductsOfLabor(this.tile, this.allocs);
    this.marginalProductsOfLand = marginalProductsOfLand(this.tile, this.allocs);
    this.marginalUtilitiesOfLabor = marginalUtilitiesOfLabor(this.tile, this.allocs);
    this.marginalUtilitiesOfLand = marginalUtilitiesOfLand(this.tile, this.allocs);
    this.totalProduction = this.products.reduce((total, p) => total + production.Total.get(p), 0);
    this.preTradeCapacity = this.tile.preTradeCapacity;
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

  optimize() {
    this.tile?.optimizeAllocations();
    this.update();
  }

  optimizeLaborOneStep() {
    this.tile?.optimizeAllocationsOneStep();
    this.update();
  }

  updateTradeLinks() {
    this.tile?.updateMarket();
    this.update();
  }

  get mods() {
    if (!this.tile) return [];
    return Object.entries(this.tile.mods);
  }

  get workerRows() {
    if (!this.tile) return [];
    return [...this.tile.prod.laborPool.allocs.entries()]
      .filter(e => e[1])
      .map(e => ({
        process: e[0], 
        fraction: e[1],
      }));
  }

  get landGroups() {
    if (!this.tile) return [];
    const tile = this.tile;
    return tile.prod.landPools
      .map(pool => ({
        terrain: pool.terrain,
        fractionOfTile: tile.fractionOf(pool.terrain),
        allocs: [...pool.allocs.entries()]
          .filter(e => e[1])
          .map(e => ({
            process: e[0],
            fraction: e[1],
          }))
      }))
      .filter(g => g.fractionOfTile);
  }

  get consumptionRows() {
    if (!this.tile) return [];
    return [...this.tile.prod.consumption.entries()]
      .map(e => ({ 
        name: e[0].name,
        amount: e[1],
        marginalUtility: this.tile ? marginalNutrition(this.tile.prod.consumption, e[0]) : 0,
      }));
  }

  floor(n: number|undefined): number { return n === undefined ? 0 : Math.floor(n); }
  round(n: number|undefined, p: number): string { return n === undefined ? '0' : n.toFixed(p); }
  percent(n: number): string { return `${Math.floor(n * 100)}%`; }
  spercent(n: number): string { 
    const s = Math.round((n - 1) * 100);
    return s < 0 ? s.toFixed(0) : `+${s.toFixed(0)}`;
  }
}

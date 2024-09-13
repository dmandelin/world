import { Component } from '@angular/core';
import { NgIf, NgFor, NgStyle } from '@angular/common';
import { AllTerrainTypes, Products  } from '../../../model/production';
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

  nutritionalQuality: number|undefined;
  capacity: number|undefined;
  preTradeCapacity: number|undefined;
  population: number|undefined;


  override update() {
    if (!this.tile) return;

    //this.preTradeCapacity = this.tile.preTradeCapacity;
    this.capacity = this.tile.capacity;
    //this.marginalCapacity = this.tile.marginalCapacity;
    //this.nutritionalQuality = this.capacity / this.totalProduction;
    this.population = this.tile.population;
  }

  updateTradeLinks() {
    this.tile?.updateMarket();
    this.update();
  }

  get mods() {
    if (!this.tile) return [];
    return Object.entries(this.tile.mods);
  }

  get workerGroups() {
    if (!this.tile) return [];
    return this.tile.prod.laborPools
      .map(pool => ({ 
        role: pool.pop.role,
        workers: pool.workers,
        allocs: [...pool.allocs.entries()]
          .filter(e => e[1])
          .map(e => ({
            process: e[0], 
            fraction: e[1],
          }))
      }))
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

  allocLand() {
    this.tile?.prod.allocate();
    this.wvm.world.notifyWatchers();
  }

  floor(n: number|undefined): number { return n === undefined ? 0 : Math.floor(n); }
  round(n: number|undefined, p: number): string { return n === undefined ? '0' : n.toFixed(p); }
  percent(n: number): string { return `${Math.floor(n * 100)}%`; }
  spercent(n: number): string { 
    const s = Math.round((n - 1) * 100);
    return s < 0 ? s.toFixed(0) : `+${s.toFixed(0)}`;
  }
}

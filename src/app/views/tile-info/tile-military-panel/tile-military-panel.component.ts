import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { TilePanelBase } from '../tile-panel-base';

@Component({
  selector: 'app-tile-military-panel',
  standalone: true,
  imports: [NgFor],
  templateUrl: './tile-military-panel.component.html',
  styleUrl: './tile-military-panel.component.scss'
})
export class TileMilitaryPanelComponent extends TilePanelBase {
  get populationEffect() {
    const e = this.tile?.raids.deltaPopulation ?? 0;
    switch (true) {
      case e === 0:
        return '';
      case e < 0:
        return `Lost ${-e}`;
      default:
        return `Gained ${e}`;
    }
  }

  get allRaids() {
    return this.tile?.raids.allRaids ?? [];
  }

  get pairedRaids() {
    return this.tile?.raids.pairedRaids ?? [];
  }
}

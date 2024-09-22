import { Component } from '@angular/core';
import { TilePanelBase } from '../tile-panel-base';
import { NgFor, NgIf } from '@angular/common';
import { Temple } from '../../../model/religion';

@Component({
  selector: 'app-tile-ideology-panel',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './tile-ideology-panel.component.html',
  styleUrl: './tile-ideology-panel.component.scss'
})
export class TileIdeologyPanelComponent extends TilePanelBase {
  get site() { 
    return this.tile?.religiousSite; 
  }

  get temple(): Temple|undefined {
    return this.site instanceof Temple ? this.site : undefined;
  }

  get traits() { 
    return this.site?.traits?.map(t => t.name).join(', '); }
}

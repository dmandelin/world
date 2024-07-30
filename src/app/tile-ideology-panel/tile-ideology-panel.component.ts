import { Component } from '@angular/core';
import { TilePanelBase } from '../util/tile-panel-base';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-tile-ideology-panel',
  standalone: true,
  imports: [NgIf],
  templateUrl: './tile-ideology-panel.component.html',
  styleUrl: './tile-ideology-panel.component.scss'
})
export class TileIdeologyPanelComponent extends TilePanelBase {
  get temple() { 
    return this.tile?.temple; 
  }

  get traits() { 
    return this.temple?.traits?.map(t => t.name).join(', '); }
}

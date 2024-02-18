import { Component } from '@angular/core';
import { World } from '../world';
import { NgFor, NgStyle } from '@angular/common';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [NgFor, NgStyle],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent {
  constructor(readonly world: World) {
  }
}

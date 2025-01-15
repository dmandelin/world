import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Pyramid, Slice } from '../model';

@Component({
  selector: 'app-pyramid',
  standalone: true,
  imports: [],
  template: `<p>pyramid works!</p>`,
  styleUrl: './pyramid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PyramidComponent {
  constructor() {
    const maxAge = 100;
    const slices = new Array(maxAge).fill(0).map((_, i) => new Slice(1000, 1000));
    this.model = new Pyramid(maxAge, slices);
  }

  readonly model: Pyramid;
}

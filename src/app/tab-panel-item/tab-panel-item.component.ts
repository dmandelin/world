import { Component, Input } from '@angular/core';
import { NgIf
  
 } from '@angular/common';
@Component({
  selector: 'app-tab-panel-item',
  imports: [NgIf],
  template: '<ng-content *ngIf="visible"></ng-content>',
  standalone: true,
  styles: []
})
export class TabPanelItemComponent {
  @Input() header: string = '';
  @Input() headerIcon: string = '';
  @Input() visible: boolean = false;
}

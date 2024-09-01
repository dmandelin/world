import { Component, ContentChildren, QueryList, AfterContentInit, TemplateRef } from '@angular/core';
import { NgIf, NgFor, NgStyle, NgComponentOutlet } from '@angular/common';
import { TabPanelItemComponent } from '../tab-panel-item/tab-panel-item.component';

@Component({
  selector: 'app-tab-panel',
  templateUrl: './tab-panel.component.html',
  imports: [NgIf, NgFor, NgStyle, NgComponentOutlet],
  standalone: true,
  styleUrls: ['./tab-panel.component.scss']
})
export class TabPanelComponent implements AfterContentInit {
  @ContentChildren(TabPanelItemComponent) tabs!: QueryList<TabPanelItemComponent>;
  activeTabIndex: number = 0;

  ngAfterContentInit() {
    // Show the first tab initially
    if (this.tabs.length > 0) {
      this.activateTab(0);
    }
  }

  activateTab(index: number) {
    this.activeTabIndex = index;
    this.tabs.forEach((tab, i) => {
      tab.visible = i === index;
    });
  }
}

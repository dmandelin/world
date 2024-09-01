import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabPanelItemComponent } from './tab-panel-item.component';

describe('TabPanelItemComponent', () => {
  let component: TabPanelItemComponent;
  let fixture: ComponentFixture<TabPanelItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabPanelItemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TabPanelItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

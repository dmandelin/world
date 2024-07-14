import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TileSummaryPanelComponent } from './tile-summary-panel.component';

describe('TileSummaryPanelComponent', () => {
  let component: TileSummaryPanelComponent;
  let fixture: ComponentFixture<TileSummaryPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileSummaryPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TileSummaryPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

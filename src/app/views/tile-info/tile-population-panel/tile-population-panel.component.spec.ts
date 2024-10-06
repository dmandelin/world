import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TilePopulationPanelComponent } from './tile-population-panel.component';

describe('TilePopulationPanelComponent', () => {
  let component: TilePopulationPanelComponent;
  let fixture: ComponentFixture<TilePopulationPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TilePopulationPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TilePopulationPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

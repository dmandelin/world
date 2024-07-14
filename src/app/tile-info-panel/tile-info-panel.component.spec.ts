import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TileInfoPanelComponent } from './tile-info-panel.component';

describe('TileInfoPanelComponent', () => {
  let component: TileInfoPanelComponent;
  let fixture: ComponentFixture<TileInfoPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileInfoPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TileInfoPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

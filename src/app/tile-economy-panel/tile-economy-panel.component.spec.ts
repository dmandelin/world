import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TileEconomyPanelComponent } from './tile-economy-panel.component';

describe('TileEconomyPanelComponent', () => {
  let component: TileEconomyPanelComponent;
  let fixture: ComponentFixture<TileEconomyPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileEconomyPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TileEconomyPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

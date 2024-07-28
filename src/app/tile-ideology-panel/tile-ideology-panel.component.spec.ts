import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TileIdeologyPanelComponent } from './tile-ideology-panel.component';

describe('TileIdeologyPanelComponent', () => {
  let component: TileIdeologyPanelComponent;
  let fixture: ComponentFixture<TileIdeologyPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileIdeologyPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TileIdeologyPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TileWaysGraphsComponent } from './tile-ways-graphs.component';

describe('TileWaysGraphsComponent', () => {
  let component: TileWaysGraphsComponent;
  let fixture: ComponentFixture<TileWaysGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileWaysGraphsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TileWaysGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

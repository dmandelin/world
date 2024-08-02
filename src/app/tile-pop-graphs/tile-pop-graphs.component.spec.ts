import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TilePopGraphsComponent } from './tile-pop-graphs.component';

describe('TilePopGraphsComponent', () => {
  let component: TilePopGraphsComponent;
  let fixture: ComponentFixture<TilePopGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TilePopGraphsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TilePopGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

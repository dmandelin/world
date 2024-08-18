import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TilePoliticsGraphsComponent } from './tile-politics-graphs.component';

describe('TilePoliticsGraphsComponent', () => {
  let component: TilePoliticsGraphsComponent;
  let fixture: ComponentFixture<TilePoliticsGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TilePoliticsGraphsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TilePoliticsGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

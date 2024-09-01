import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TileMilitaryPanelComponent } from './tile-military-panel.component';

describe('TileMilitaryPanelComponent', () => {
  let component: TileMilitaryPanelComponent;
  let fixture: ComponentFixture<TileMilitaryPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TileMilitaryPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TileMilitaryPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

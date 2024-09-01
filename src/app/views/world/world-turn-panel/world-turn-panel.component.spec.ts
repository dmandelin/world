import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorldTurnPanelComponent } from './world-turn-panel.component';

describe('WorldTurnPanelComponent', () => {
  let component: WorldTurnPanelComponent;
  let fixture: ComponentFixture<WorldTurnPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorldTurnPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WorldTurnPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

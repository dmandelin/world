import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorldLogPanelComponent } from './world-log-panel.component';

describe('WorldLogPanelComponent', () => {
  let component: WorldLogPanelComponent;
  let fixture: ComponentFixture<WorldLogPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorldLogPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WorldLogPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

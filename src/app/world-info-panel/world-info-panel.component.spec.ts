import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorldInfoPanelComponent } from './world-info-panel.component';

describe('WorldInfoPanelComponent', () => {
  let component: WorldInfoPanelComponent;
  let fixture: ComponentFixture<WorldInfoPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorldInfoPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WorldInfoPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import {AreaMapComponent } from './area-map.component';

describe('MapCanvasComponent', () => {
  let component: AreaMapComponent
  let fixture: ComponentFixture<AreaMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AreaMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

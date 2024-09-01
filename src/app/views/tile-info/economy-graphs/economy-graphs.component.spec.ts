import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EconomyGraphsComponent } from './economy-graphs.component';

describe('EconomyGraphsComponent', () => {
  let component: EconomyGraphsComponent;
  let fixture: ComponentFixture<EconomyGraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EconomyGraphsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EconomyGraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

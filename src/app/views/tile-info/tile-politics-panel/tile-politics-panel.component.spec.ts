import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TilePoliticsPanelComponent } from './tile-politics-panel.component';

describe('TilePoliticsPanelComponent', () => {
  let component: TilePoliticsPanelComponent;
  let fixture: ComponentFixture<TilePoliticsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TilePoliticsPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TilePoliticsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

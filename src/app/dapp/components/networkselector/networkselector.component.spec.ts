import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkSelectorComponent } from './networkselector.component';

describe('NetworkselectorComponent', () => {
  let component: NetworkSelectorComponent;
  let fixture: ComponentFixture<NetworkSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkSelectorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NetworkSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

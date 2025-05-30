import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InirComponentsComponent } from './inir-components.component';

describe('InirComponentsComponent', () => {
  let component: InirComponentsComponent;
  let fixture: ComponentFixture<InirComponentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InirComponentsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InirComponentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

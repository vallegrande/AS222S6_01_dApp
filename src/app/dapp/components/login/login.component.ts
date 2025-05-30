import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { WalletService } from '../../services/wallet.service';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzSpinModule,
    NzDividerModule,
    NzTypographyModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  isMetaMaskConnected = false;
  walletAddress: string = '';
  private walletSubscription?: Subscription;
  translateSubscription: Subscription;

  constructor(
    private fb: FormBuilder,
    private message: NzMessageService,
    private router: Router,
    private walletService: WalletService,
    private modalRef: NzModalRef,
    private translate: TranslateService

  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Verificar si ya existe conexión previa con MetaMask
    this.checkExistingConnection();
    
    // Subscribe to wallet changes
    this.walletSubscription = this.walletService.wallet$.subscribe(wallet => {
      if (wallet) {
        this.isMetaMaskConnected = true;
        this.walletAddress = wallet.address;
      } else {
        this.isMetaMaskConnected = false;
        this.walletAddress = '';
      }
    });
  }


  ngOnDestroy(): void {
    // Clean up subscription
    if (this.walletSubscription) {
      this.walletSubscription.unsubscribe();
    }
  }

  // Método para verificar si ya hay una conexión existente
  async checkExistingConnection(): Promise<void> {
    if (this.walletService.isConnected()) {
      const address = await this.walletService.getCurrentAddress();
      if (address) {
        this.walletAddress = address;
        this.isMetaMaskConnected = true;
        
        // Cerrar el modal
        this.modalRef.close();
        
        // Navegar a wallet si ya está conectado
        setTimeout(() => {
          this.router.navigate(['wallet']);
        }, 100);
      }
    }
  }

  async connectMetaMask(): Promise<void> {
    this.isLoading = true;
    
    try {
      const address = await this.walletService.connectWallet();
      
      if (!address) {
        this.isLoading = false;
        return;
      }
      
      // Cerrar el modal antes de navegar
      this.modalRef.close();
      
      // Redirigir al componente wallet
      setTimeout(() => {
        this.router.navigate(['wallet']);
      }, 100);
    } catch (error: any) {
      this.message.error(error.message || 'Error al conectar con MetaMask');
    } finally {
      this.isLoading = false;
    }
  }

  disconnectMetaMask(): void {
    this.walletService.disconnectWallet();
  }
}
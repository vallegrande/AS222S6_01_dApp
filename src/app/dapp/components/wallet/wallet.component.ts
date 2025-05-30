import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { WalletService } from '../../services/wallet.service';
import { Subscription } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

declare let window: any;

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
    NzAvatarModule,
    NzBadgeModule,
    NzButtonModule
  ],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.css'
})
export class WalletComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  walletAddress: string = '';
  accountBalance: string = '0.00';
  screenWidth: number;
  private walletSubscription?: Subscription;
  private translateSubscription?: Subscription;

  constructor(
    private router: Router,
    private message: NzMessageService,
    private walletService: WalletService,
    private translate: TranslateService
  ) {
    // Inicializar el ancho de la pantalla
    this.screenWidth = window.innerWidth;
    
    // Auto-colapsar el menú en pantallas pequeñas
    this.isCollapsed = this.screenWidth < 768;
  }

  // Detector de cambios de tamaño de pantalla
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenWidth = event.target.innerWidth;
    
    // Auto-colapsar el menú en pantallas pequeñas
    if (this.screenWidth < 768) {
      this.isCollapsed = true;
    }
  }

  private initializeTranslations() {
    // Cargar idioma guardado o usar español por defecto
    const idiomaGuardado = localStorage.getItem('idioma-preferido') || 'es';
    
    this.translate.setDefaultLang('es');
    this.translate.use(idiomaGuardado);

    // Suscribirse a cambios de idioma para actualizar el componente
    this.translateSubscription = this.translate.onLangChange.subscribe(() => {
      console.log('🔄 Idioma cambiado en WalletComponent:', this.translate.currentLang);
    });

    // Debug para verificar que las traducciones funcionan
    console.log('Idioma actual:', this.translate.currentLang);
    this.translate.get('navbar.inicio').subscribe(text => {
      console.log('Traducción test:', text);
    });
  }

  ngOnInit(): void {
    // Inicializar traducciones PRIMERO
    this.initializeTranslations();
    
    // Verificar si hay una conexión activa con MetaMask
    this.checkWalletConnection();
    
    // Suscribirse a los cambios del wallet en el servicio
    this.walletSubscription = this.walletService.wallet$.subscribe(wallet => {
      if (wallet) {
        this.walletAddress = wallet.address;
        this.getAccountBalance();
      } else {
        // Si el wallet se desconecta, redirigir al login
        this.router.navigate(['/']);
      }
    });
    
    // Escuchar cambios de cuenta en MetaMask
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.getAccountBalance();
        } else {
          // Si no hay cuentas, redirigir al login
          this.walletService.disconnectWallet();
          this.router.navigate(['/']);
        }
      });
      
      // Escuchar cambios de red
      window.ethereum.on('chainChanged', () => {
        // Recargar la aplicación cuando cambie la red
        window.location.reload();
      });
    }
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones para evitar memory leaks
    if (this.walletSubscription) {
      this.walletSubscription.unsubscribe();
    }
    
    // Limpiar suscripción de traducción
    if (this.translateSubscription) {
      this.translateSubscription.unsubscribe();
    }
    
    // Remover listeners de eventos de MetaMask
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }

  async checkWalletConnection(): Promise<void> {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.getAccountBalance();
        } else {
          this.router.navigate(['/']);
        }
      } catch (error) {
        console.error('Error al verificar la conexión de wallet:', error);
        this.router.navigate(['/']);
      }
    } else {
      this.message.error('MetaMask no está instalado');
      this.router.navigate(['/']);
    }
  }

  async getAccountBalance(): Promise<void> {
    if (window.ethereum && this.walletAddress) {
      try {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [this.walletAddress, 'latest']
        });
        
        // Convertir balance de wei a ETH
        const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
        this.accountBalance = ethBalance.toFixed(4);
      } catch (error) {
        console.error('Error al obtener el balance:', error);
      }
    }
  }

  disconnectWallet(): void {
    this.walletService.disconnectWallet();
    this.router.navigate(['/']);
  }
}
import { Component, OnInit, HostListener } from '@angular/core';
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

declare let window: any;

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [
    CommonModule,
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
export class WalletComponent implements OnInit {
  isCollapsed = false;
  walletAddress: string = '';
  accountBalance: string = '0.00';
  screenWidth: number;

  constructor(
    private router: Router,
    private message: NzMessageService
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

  ngOnInit(): void {
    // Verificar si hay una conexión activa con MetaMask
    this.checkWalletConnection();
    
    // Escuchar cambios de cuenta en MetaMask
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.getAccountBalance();
        } else {
          // Si no hay cuentas, redirigir al login
          this.router.navigate(['/login']);
        }
      });
      
      // Escuchar cambios de red
      window.ethereum.on('chainChanged', () => {
        // Recargar la aplicación cuando cambie la red
        window.location.reload();
      });
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
          // No hay cuentas conectadas, redirigir al login
          this.router.navigate(['/login']);
        }
      } catch (error) {
        console.error('Error al verificar la conexión de wallet:', error);
        this.router.navigate(['/login']);
      }
    } else {
      this.message.error('MetaMask no está instalado');
      this.router.navigate(['/login']);
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
    // MetaMask no tiene un método de desconexión, así que simulamos el logout
    this.message.success('Sesión cerrada correctamente');
    this.router.navigate(['/login']);
  }
}
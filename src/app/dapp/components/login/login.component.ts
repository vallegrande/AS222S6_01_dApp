import { Component, OnInit } from '@angular/core';
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
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTypographyModule } from 'ng-zorro-antd/typography';

declare let window: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzMessageModule,
    NzSpinModule,
    NzDividerModule,
    NzTypographyModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  isMetaMaskConnected = false;
  walletAddress: string = '';

  constructor(
    private fb: FormBuilder, 
    private message: NzMessageService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Verificar si ya existe conexión previa con MetaMask
    this.checkExistingConnection();
  }

  // Método para verificar si ya hay una conexión existente
  async checkExistingConnection(): Promise<void> {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // Intentar obtener las cuentas sin solicitar permiso
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' // Usa eth_accounts en lugar de eth_requestAccounts para no mostrar popup
        });
        
        if (accounts && accounts.length > 0) {
          this.walletAddress = accounts[0];
          this.isMetaMaskConnected = true;
          
          // Configurar listeners para eventos de cambio de cuenta
          this.setupEthereumListeners();
          
          // Navegar a wallet si ya está conectado
          setTimeout(() => {
            this.router.navigate(['wallet']);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error al verificar conexión existente:', error);
    }
  }

  setupEthereumListeners(): void {
    // Escuchar cambios de cuenta
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // El usuario desconectó todas las cuentas
          this.disconnectMetaMask();
        } else {
          // Actualizar la dirección actual
          this.walletAddress = accounts[0];
        }
      });
      
      // Escuchar cambios de red
      window.ethereum.on('chainChanged', () => {
        // Recargar la aplicación cuando cambie la red
        window.location.reload();
      });
    }
  }

  async connectMetaMask(): Promise<void> {
    this.isLoading = true;

    try {
      if (typeof window.ethereum === 'undefined') {
        this.message.error('¡MetaMask no está instalado! Por favor instala MetaMask para continuar.');
        this.isLoading = false;
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        this.message.error('No se encontraron cuentas o se denegó el permiso.');
        this.isLoading = false;
        return;
      }
      
      this.walletAddress = accounts[0];
      this.isMetaMaskConnected = true;
      this.message.success('¡Conectado correctamente a MetaMask!');
      
      // Configurar listeners para eventos
      this.setupEthereumListeners();
      
      // Redirigir al componente wallet
      setTimeout(() => {
        this.router.navigate(['wallet']);
      }, 1500);
    } catch (error: any) {
      this.message.error(error.message || 'Error al conectar con MetaMask');
    } finally {
      this.isLoading = false;
    }
  }

  disconnectMetaMask(): void {
    this.isMetaMaskConnected = false;
    this.walletAddress = '';
    this.message.info('Desconectado de MetaMask');
  }
}
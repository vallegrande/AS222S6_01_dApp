import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { ethers } from 'ethers';
import { NzMessageService } from 'ng-zorro-antd/message';
import { WalletInterface } from '../interfaces/wallet.interface';
import { Router, ActivatedRoute } from '@angular/router';
import { WalletTransactionService } from './wallet-transaction.service';
import { Location } from '@angular/common';

declare global {
  interface Window {
    ethereum: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;

  private walletSubject = new BehaviorSubject<WalletInterface | null>(null);
  public wallet$ = this.walletSubject.asObservable();

  private autoRefreshSubscription?: Subscription;

  private isWalletConnected = false;

  // Almacenar la última URL visitada
  private lastUrl: string = '';

  // Flag para controlar si está en proceso de cambio de red
  private networkChanging: boolean = false;

  constructor(
    private message: NzMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private walletTransactionService: WalletTransactionService
  ) {
    // Guardar la ruta actual al iniciar el servicio
    this.saveCurrentRoute();

    // Escuchar cambios de ruta para guardar siempre la última
    this.router.events.subscribe(() => {
      this.saveCurrentRoute();
    });
  }

  /**
   * Guarda la ruta actual para restaurarla después
   */
  private saveCurrentRoute(): void {
    if (this.router.url && this.router.url !== '/' && !this.router.url.includes('/inir-components')) {
      this.lastUrl = this.router.url;
      // También guardar en localStorage para persistir entre recargas de página
      localStorage.setItem('lastRoute', this.lastUrl);
    }
  }

  /**
   * Recupera la última ruta guardada
   */
  private getLastRoute(): string {
    // Intenta obtener primero del estado de la aplicación, luego del localStorage
    return this.lastUrl || localStorage.getItem('lastRoute') || '/wallet/dashboard';
  }

  /**
   * Reconectar el proveedor Ethereum
   */
  private async reconnectProvider(): Promise<boolean> {
    try {
      if (!window.ethereum) return false;

      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      // Forzar la actualización de la red
      await this.provider.ready;

      this.signer = this.provider.getSigner();

      // Verificar que tenemos una cuenta conectada
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) return false;

      // CORREGIDO: Pasar un string vacío como contractAddress por defecto
      this.walletTransactionService.setProviderAndSigner(this.provider, this.signer, '');

      return true;
    } catch (error) {
      console.error('Error al reconectar el proveedor:', error);
      return false;
    }
  }

  /**
   * Conectar a MetaMask
   */
  async connectWallet(): Promise<string | null> {
    try {
      if (typeof window.ethereum === 'undefined') {
        this.message.error('MetaMask no está instalado');
        return null;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

      if (accounts.length === 0) {
        this.message.error('No se pudo acceder a ninguna cuenta');
        return null;
      }

      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      await this.provider.ready; // Esperar a que el proveedor esté listo

      this.signer = this.provider.getSigner();
      const address = await this.signer.getAddress();

      // CORREGIDO: Pasar un string vacío como contractAddress por defecto
      this.walletTransactionService.setProviderAndSigner(this.provider, this.signer, '');

      // Eliminar listeners anteriores para evitar duplicados
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // Desconectar sin navegar cuando se desconecta la cuenta
          this.disconnectWallet(false);
        } else {
          // Esperar un momento antes de refrescar los datos
          setTimeout(() => {
            this.refreshWalletData();
          }, 500);
        }
      });

      window.ethereum.on('chainChanged', (_chainId: string) => {
        // Marcar que estamos en proceso de cambio de red
        this.networkChanging = true;

        // Desactivar temporalmente la actualización automática
        this.stopAutoRefresh();

        // Esperar a que la red cambie completamente antes de reconectar y refrescar
        setTimeout(async () => {
          try {
            // Reconectar el proveedor con la nueva red
            const reconnected = await this.reconnectProvider();

            if (reconnected) {
              // Reiniciar la actualización automática
              this.startAutoRefresh();

              // Actualizar los datos de la wallet con la nueva red
              await this.refreshWalletData();
            } else {
              this.message.warning('No se pudo reconectar con la nueva red');
            }
          } catch (error: any) {
            this.message.error(`Error al cambiar de red: ${error.message}`);
          } finally {
            // Finalizar el proceso de cambio de red
            this.networkChanging = false;

            // Restaurar la ubicación actual si hay cambio de URL
            const currentPath = this.router.url;
            const lastRoute = this.getLastRoute();

            if (currentPath !== lastRoute && currentPath === '/') {
              this.router.navigateByUrl(lastRoute);
            }
          }
        }, 1500); // Esperar 1.5 segundos para que MetaMask termine de cambiar la red
      });

      this.isWalletConnected = true;

      await this.refreshWalletData();

      this.startAutoRefresh();

      // Si estamos en la página principal, navegar a la última ruta
      if (this.router.url === '/' || this.router.url === '/inir-components') {
        const lastRoute = this.getLastRoute();
        if (lastRoute) {
          this.router.navigateByUrl(lastRoute);
        }
      }

      return address;
    } catch (error: any) {
      this.message.error(`Error al conectar: ${error.message}`);
      return null;
    }
  }

  async getAddressBalance(address: string): Promise<number> {
    if (!this.providerInstance) return 0;

    try {
      const balance = await this.providerInstance.getBalance(address);
      return parseFloat(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error('Error al obtener balance:', error);
      return 0;
    }
  }

  get providerInstance(): ethers.providers.Web3Provider | null {
    return this.provider;
  }

  get signerInstance(): ethers.Signer | null {
    return this.signer;
  }

  /**
   * Iniciar actualización automática
   */
  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.autoRefreshSubscription = interval(15000).subscribe(() => {
      // No actualizar si estamos en proceso de cambio de red
      if (!this.networkChanging) {
        this.refreshWalletData(true);
      }
    });
  }

  /**
   * Detener actualización automática
   */
  private stopAutoRefresh(): void {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
      this.autoRefreshSubscription = undefined;
    }
  }

  /**
   * Desconectar wallet
   * @param navigateToHome Si es true, navega a la página de inicio. Por defecto es false.
   */
  disconnectWallet(navigateToHome: boolean = false): void {
    this.stopAutoRefresh();

    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }

    this.provider = null;
    this.signer = null;
    this.isWalletConnected = false;
    this.walletSubject.next(null);

    this.walletTransactionService.reset();

    this.message.info('Wallet desconectada');

    // Solo navegar a la página de inicio si se especifica explícitamente
    if (navigateToHome) {
      this.router.navigate(['/inir-components']);
    }
  }

  /**
   * Actualizar todos los datos de la wallet
   */
  async refreshWalletData(silent: boolean = false): Promise<void> {
    // No actualizar si estamos en proceso de cambio de red
    if (this.networkChanging) {
      return;
    }

    if (!this.provider || !this.signer || !this.isWalletConnected) {
      return;
    }

    try {
      // Verificar si tenemos acceso a las cuentas
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        this.disconnectWallet(false); // No navegar al desconectar
        return;
      }

      // Verificar que el proveedor esté listo antes de continuar
      await this.provider.ready;

      // Intento de obtener la dirección actual
      let address;
      try {
        address = await this.signer.getAddress();
      } catch (error) {
        console.error('Error al obtener la dirección del signer:', error);

        // Intentar reconectar el proveedor
        const reconnected = await this.reconnectProvider();
        if (!reconnected) {
          throw new Error('No se pudo obtener la dirección de la wallet');
        }

        // Intentar obtener la dirección nuevamente
        address = await this.signer.getAddress();
      }

      // Obtener información de la red actual
      let network;
      try {
        network = await this.provider.getNetwork();
      } catch (error) {
        console.error('Error al obtener la red:', error);

        // Intentar reconectar el proveedor
        const reconnected = await this.reconnectProvider();
        if (!reconnected) {
          throw new Error('No se pudo obtener la información de la red');
        }

        // Intentar obtener la red nuevamente
        network = await this.provider.getNetwork();
      }

      // Obtener el balance de ETH
      let balance;
      try {
        balance = parseFloat(ethers.utils.formatEther(await this.provider.getBalance(address)));
      } catch (error) {
        console.error('Error al obtener el balance:', error);
        balance = 0;
      }

      // Obtener transacciones y balances de tokens
      let transactions: string | any[] = [];
      let tokenBalance = 0;
      let nftCount = 0;

      try {
        transactions = await this.walletTransactionService.getTransactions(address);
      } catch (error) {
        console.error('Error al obtener transacciones:', error);
        transactions = [];
      }

      try {
        tokenBalance = await this.walletTransactionService.getTokenBalance(address);
      } catch (error) {
        console.error('Error al obtener balance de tokens:', error);
        tokenBalance = 0;
      }

      try {
        nftCount = await this.walletTransactionService.getNFTCount(address);
      } catch (error) {
        console.error('Error al obtener conteo de NFTs:', error);
        nftCount = 0;
      }

      const currentWallet = this.walletSubject.getValue();
      const hasNewTransactions = currentWallet &&
        transactions.length > 0 &&
        (!currentWallet.transactions.length ||
          transactions[0].hash !== currentWallet.transactions[0]?.hash);

      if (!silent && hasNewTransactions) {
        this.message.success('¡Se han detectado nuevas transacciones!');
      }

      this.walletSubject.next({
        address,
        balance,
        network: network.name,
        tokenBalance,
        nftCount,
        transactionCount: transactions.length,
        transactions
      });
    } catch (error: any) {
      if (!silent) {
        this.message.error(`Error al actualizar datos: ${error.message}`);
        console.error('Error completo al actualizar datos:', error);
      } else {
        console.error('Error en actualización silenciosa:', error);
      }
    }
  }

  /**
   * Verificar si la wallet está conectada
   */
  isConnected(): boolean {
    return this.isWalletConnected && this.provider !== null && this.signer !== null;
  }

  /**
   * Obtener la dirección actual
   */
  async getCurrentAddress(): Promise<string | null> {
    if (!this.signer || !this.isWalletConnected) return null;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        this.disconnectWallet(false); // No navegar al desconectar
        return null;
      }
      return await this.signer.getAddress();
    } catch {
      return null;
    }
  }

  /**
   * Detectar nuevas transacciones
   */
  async checkForNewTransactions(): Promise<boolean> {
    if (!this.provider || !this.signer || !this.isWalletConnected || this.networkChanging) {
      return false;
    }

    try {
      return await this.walletTransactionService.checkForNewTransactions();
    } catch (error) {
      console.error("Error al verificar nuevas transacciones:", error);
      return false;
    }
  }

  /**
   * Enviar ETH - Delegado al servicio de transacciones
   */
  async sendEth(to: string, amount: string): Promise<string | null> {
    if (!this.isConnected()) {
      this.message.error('Wallet no conectada');
      return null;
    }

    const result = await this.walletTransactionService.sendEth(to, amount);

    if (result) {
      // NO esperar - refrescar en background
      setTimeout(() => this.refreshWalletData(), 2000);
    }

    return result;
  }

  /**
   * Enviar tokens ERC20 - Delegado al servicio de transacciones
   */
  async sendTokens(to: string, amount: string, contractAddress: string): Promise<string | null> {
    if (!this.isConnected()) {
      this.message.error('Wallet no conectada');
      return null;
    }

    const result = await this.walletTransactionService.sendTokens(to, amount, contractAddress);

    if (result) {
      this.refreshWalletData();
    }

    return result;
  }
}
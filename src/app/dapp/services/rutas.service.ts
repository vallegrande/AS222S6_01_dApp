import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ethers } from 'ethers';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

export interface NetworkInfo {
  id: string;
  name: string;
  chainId: number;  
  rpcUrl: string;
  blockExplorer: string;
  currencySymbol: string;
  isTestnet: boolean;
}

@Injectable({
  providedIn: 'root'
})

export class RutasService{
  // Lista de redes disponibles
  private networks: NetworkInfo[] = [
    {
      id: 'ethereum-mainnet',
      name: 'Ethereum Mainnet',
      chainId: 1,
      rpcUrl: 'https://mainnet.infura.io/v3/your-api-key',
      blockExplorer: 'https://etherscan.io',
      currencySymbol: 'ETH',
      isTestnet: false
    },
    {
      id: 'holesky',
      name: 'Holesky Testnet',
      chainId: 17000,
      rpcUrl: 'https://ethereum-holesky.publicnode.com',
      blockExplorer: 'https://holesky.etherscan.io',
      currencySymbol: 'ETH',
      isTestnet: true
    },
    {
      id: 'sepolia',
      name: 'Sepolia Testnet',
      chainId: 11155111,
      rpcUrl: 'https://ethereum-sepolia.publicnode.com',
      blockExplorer: 'https://sepolia.etherscan.io',
      currencySymbol: 'ETH',
      isTestnet: true
    },
    {
      id: 'ephemery',
      name: 'Ephemery Testnet',
      chainId: 1337803,
      rpcUrl: 'https://ephemery.dev',
      blockExplorer: 'https://explorer.ephemery.dev',
      currencySymbol: 'ETH',
      isTestnet: true
    }
  ];

  // Red actualmente seleccionada
  private currentNetworkSubject = new BehaviorSubject<NetworkInfo>(this.networks[0]);
  public currentNetwork$ = this.currentNetworkSubject.asObservable();
  
  // Variable para controlar si el cambio de red debe mantener el estado - siempre true ahora
  private preserveState: boolean = true;

  // Guardar la URL actual antes del cambio de red
  private lastUrl: string = '';

  constructor(
    private message: NzMessageService,
    private router: Router,
    private location: Location
  ) {
    // Detectar la red actual al inicializar
    this.detectCurrentNetwork();
    
    // Guardar la ruta actual
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
   * Obtener la lista de redes disponibles
   */
  getAvailableNetworks(): NetworkInfo[] {
    return [...this.networks];
  }

  /**
   * Obtener solo las redes de prueba (testnets)
   */
  getTestnets(): NetworkInfo[] {
    return this.networks.filter(network => network.isTestnet);
  }

  /**
   * Obtener solo las redes principales (mainnets)
   */
  getMainnets(): NetworkInfo[] {
    return this.networks.filter(network => !network.isTestnet);
  }

  /**
   * Detectar la red actual conectada en MetaMask
   */
  async detectCurrentNetwork(): Promise<NetworkInfo | null> {
    if (typeof window.ethereum === 'undefined') {
      return null;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      const chainId = network.chainId;

      // Buscar la red por chainId
      const matchedNetwork = this.networks.find(n => n.chainId === chainId);
      
      if (matchedNetwork) {
        this.currentNetworkSubject.next(matchedNetwork);
        return matchedNetwork;
      } else {
        // Si no se encuentra la red en nuestra lista, crear una genérica
        const unknownNetwork: NetworkInfo = {
          id: `unknown-${chainId}`,
          name: `Red Desconocida (${chainId})`,
          chainId: chainId,
          rpcUrl: '',
          blockExplorer: '',
          currencySymbol: 'ETH',
          isTestnet: false
        };
        
        this.currentNetworkSubject.next(unknownNetwork);
        return unknownNetwork;
      }
    } catch (error) {
      console.error('Error al detectar la red actual:', error);
      return null;
    }
  }

  /**
   * Habilitar o deshabilitar la preservación del estado al cambiar de red
   * Este método ya no tiene efecto, siempre se preserva el estado
   */
  setPreserveState(preserve: boolean): void {
    this.preserveState = true; // Siempre true para evitar redireccionamientos
  }

  /**
   * Cambiar a una red específica por su ID
   */
  async switchNetwork(networkId: string): Promise<boolean> {
    const network = this.networks.find(n => n.id === networkId);
    
    if (!network) {
      this.message.error(`Red "${networkId}" no encontrada`);
      return false;
    }

    return await this.switchToChainId(network);
  }

  /**
   * Cambiar a una red por su objeto NetworkInfo
   */
  async switchToChainId(network: NetworkInfo): Promise<boolean> {
    if (typeof window.ethereum === 'undefined') {
      this.message.error('MetaMask no está instalado');
      return false;
    }

    try {
      // Guardar la URL actual para volver después del cambio
      const currentUrl = this.router.url;
      
      // Intentar cambiar a la red
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
      
      // Actualizar la red actual
      this.currentNetworkSubject.next(network);
      this.message.success(`Red cambiada a ${network.name}`);
      
      // Asegurarnos de que la aplicación permanezca en la misma ruta
      setTimeout(() => {
        const lastRoute = this.getLastRoute();
        
        // Si después del cambio de red la aplicación está en la página principal,
        // volver a la ruta anterior
        if (this.router.url === '/' || this.router.url === '/inir-components') {
          this.router.navigateByUrl(lastRoute);
        }
        
        // Si la URL cambió durante el proceso, restaurarla usando Location
        if (this.router.url !== currentUrl && 
            this.router.url !== '/' && 
            this.router.url !== '/inir-components') {
          this.location.replaceState(currentUrl);
        }
      }, 300);
      
      return true;
    } catch (error: any) {
      // Si el error es 4902, la red no existe en MetaMask y necesitamos agregarla
      if (error.code === 4902) {
        return await this.addNetwork(network);
      } else {
        this.message.error(`Error al cambiar red: ${error.message}`);
        return false;
      }
    }
  }

  /**
   * Agregar una nueva red a MetaMask
   */
  private async addNetwork(network: NetworkInfo): Promise<boolean> {
    // Guardar la URL actual para volver después del cambio
    const currentUrl = this.router.url;
    
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${network.chainId.toString(16)}`,
            chainName: network.name,
            nativeCurrency: {
              name: network.currencySymbol,
              symbol: network.currencySymbol,
              decimals: 18
            },
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.blockExplorer]
          }
        ]
      });
      
      // Actualizar la red actual
      this.currentNetworkSubject.next(network);
      this.message.success(`Red ${network.name} agregada y seleccionada`);
      
      // Restaurar la ruta después de agregar la red
      setTimeout(() => {
        const lastRoute = this.getLastRoute();
        
        // Si después del cambio de red la aplicación está en la página principal,
        // volver a la ruta anterior
        if (this.router.url === '/' || this.router.url === '/inir-components') {
          this.router.navigateByUrl(lastRoute);
        }
        
        // Si la URL cambió durante el proceso, restaurarla usando Location
        if (this.router.url !== currentUrl && 
            this.router.url !== '/' && 
            this.router.url !== '/inir-components') {
          this.location.replaceState(currentUrl);
        }
      }, 300);
      
      return true;
    } catch (error: any) {
      this.message.error(`Error al agregar red: ${error.message}`);
      return false;
    }
  }

  /**
   * Registrar una nueva red personalizada
   */
  registerCustomNetwork(network: NetworkInfo): void {
    // Verificar si ya existe una red con el mismo chainId
    const existingNetwork = this.networks.find(n => n.chainId === network.chainId);
    
    if (existingNetwork) {
      // Actualizar la red existente
      const index = this.networks.indexOf(existingNetwork);
      this.networks[index] = network;
    } else {
      // Agregar la nueva red
      this.networks.push(network);
    }
  }

  /**
   * Obtener la URL del explorador de bloques para la red actual
   */
  getBlockExplorerUrl(): string {
    return this.currentNetworkSubject.getValue().blockExplorer;
  }

  /**
   * Construir una URL para una transacción en el explorador de bloques
   */
  getTransactionExplorerUrl(txHash: string): string {
    const baseUrl = this.getBlockExplorerUrl();
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * Construir una URL para una dirección en el explorador de bloques
   */
  getAddressExplorerUrl(address: string): string {
    const baseUrl = this.getBlockExplorerUrl();
    return `${baseUrl}/address/${address}`;
  }

  /**
   * Obtener el símbolo de la moneda nativa de la red actual
   */
  getCurrentCurrencySymbol(): string {
    return this.currentNetworkSubject.getValue().currencySymbol;
  }
}
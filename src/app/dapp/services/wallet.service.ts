import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { ethers } from 'ethers';
import { NzMessageService } from 'ng-zorro-antd/message';
import { WalletInterface, Transaction } from '../interfaces/wallet.interface';

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
  
  private readonly ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint amount)"
  ];
  
  // ERC721 ABI mínimo para NFTs
  private readonly ERC721_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)"
  ];
  
  private readonly MY_ADDRESS = '0xd5eADFc19df7d604546eE4d98B03B9c6dfCbE2df';
  
  private readonly ETHERSCAN_API_KEY = 'UPMI6M2UPFJET8STD4VYYUFGB8T83HKHPG';
  
  private walletSubject = new BehaviorSubject<WalletInterface | null>(null);
  public wallet$ = this.walletSubject.asObservable();
  
  // Intervalo de actualización automática (cada 15 segundos)
  private autoRefreshSubscription?: Subscription;
  
  // Último bloque procesado
  private lastProcessedBlock: number = 0;
  
  constructor(private message: NzMessageService) {}
  
  /**
   * Conectar a MetaMask
   */
  async connectWallet(): Promise<string | null> {
    try {
      if (typeof window.ethereum === 'undefined') {
        this.message.error('MetaMask no está instalado');
        return null;
      }
      
      // Solicitar cuentas a MetaMask
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length === 0) {
        this.message.error('No se pudo acceder a ninguna cuenta');
        return null;
      }
      
      // Configurar el provider y signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      const address = await this.signer.getAddress();
      
      // Escuchar cambios de cuenta
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.disconnectWallet();
        } else {
          this.refreshWalletData();
        }
      });
      
      // Escuchar cambios de red
      window.ethereum.on('chainChanged', () => {
        this.refreshWalletData();
      });
      
      // Cargar datos iniciales
      await this.refreshWalletData();
      
      // Iniciar actualización automática
      this.startAutoRefresh();
      
      return address;
    } catch (error: any) {
      this.message.error(`Error al conectar: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Iniciar actualización automática
   */
  private startAutoRefresh(): void {
    // Detener cualquier suscripción previa
    this.stopAutoRefresh();
    
    // Actualizar cada 15 segundos
    this.autoRefreshSubscription = interval(15000).subscribe(() => {
      this.refreshWalletData(true); // true indica que es una actualización silenciosa
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
   */
  disconnectWallet(): void {
    this.stopAutoRefresh();
    this.provider = null;
    this.signer = null;
    this.walletSubject.next(null);
    this.message.info('Wallet desconectada');
  }
  
  /**
   * Actualizar todos los datos de la wallet
   */
  async refreshWalletData(silent: boolean = false): Promise<void> {
    if (!this.provider || !this.signer) {
      return;
    }
    
    try {
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      const balance = parseFloat(ethers.utils.formatEther(await this.provider.getBalance(address)));
      
      const transactions = await this.getTransactions(address);
      
      const tokenBalance = await this.getTokenBalance(address);
      
      const nftCount = await this.getNFTCount(address);
      
      // Verificar si hay transacciones nuevas
      const currentWallet = this.walletSubject.getValue();
      const hasNewTransactions = currentWallet && 
            transactions.length > 0 && 
            (!currentWallet.transactions.length || 
             transactions[0].hash !== currentWallet.transactions[0]?.hash);
      
      // Notificar sobre nuevas transacciones, si no es actualización silenciosa
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
      
      // Almacenar último bloque procesado
      if (this.provider) {
        this.lastProcessedBlock = await this.provider.getBlockNumber();
      }
    } catch (error: any) {
      if (!silent) {
        this.message.error(`Error al actualizar datos: ${error.message}`);
      } else {
        console.error('Error en actualización silenciosa:', error);
      }
    }
  }
  
  /**
   * Obtener balance de tokens ERC20
   */
  private async getTokenBalance(address: string): Promise<number> {
    try {
      if (!this.provider) return 0;
      
      // Obtener información real de tokens desde la API de Etherscan para Holesky
      const apiUrl = `https://api-holesky.etherscan.io/api?module=account&action=tokenbalance&contractaddress=CONTRACT_ADDRESS&address=${address}&tag=latest&apikey=${this.ETHERSCAN_API_KEY}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.status === '1') {
        return parseFloat(ethers.utils.formatUnits(data.result, 18)); // Asumiendo 18 decimales
      }
      
      return 0;
    } catch (error) {
      console.error("Error al obtener balance de tokens:", error);
      return 0;
    }
  }
  
  /**
   * Obtener recuento de NFTs
   */
  private async getNFTCount(address: string): Promise<number> {
    try {
      const apiUrl = `https://api-holesky.etherscan.io/api?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=999999999&sort=asc&apikey=${this.ETHERSCAN_API_KEY}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.status === '1' && Array.isArray(data.result)) {
        const uniqueTokens = new Set();
        
        for (const tx of data.result) {
          if (tx.to.toLowerCase() === address.toLowerCase()) {
            uniqueTokens.add(`${tx.contractAddress}-${tx.tokenID}`);
          } else if (tx.from.toLowerCase() === address.toLowerCase()) {
            uniqueTokens.delete(`${tx.contractAddress}-${tx.tokenID}`);
          }
        }
        
        return uniqueTokens.size;
      }
      
      return 0;
    } catch (error) {
      console.error("Error al obtener NFTs:", error);
      return 0;
    }
  }
  
  /**
   * Obtener historial de transacciones completo
   */
  private async getTransactions(address: string): Promise<Transaction[]> {
    try {
      // Usar el último bloque actual
      const currentBlock = this.provider ? await this.provider.getBlockNumber() : 99999999;
      
      // Obtener todas las transacciones - no se limita a 10
      const apiUrl = `https://api-holesky.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=${currentBlock}&sort=desc&apikey=${this.ETHERSCAN_API_KEY}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.status === '1') {
        // Convertir todas las transacciones, sin limitarse a 10
        return data.result.map((tx: any) => {
          const isSent = tx.from.toLowerCase() === address.toLowerCase();
          return {
            hash: tx.hash,
            type: isSent ? 'sent' : 'received',
            amount: ethers.utils.formatEther(tx.value) + ' ETH',
            status: tx.confirmations > 12 ? 'completado' : tx.confirmations > 0 ? 'pendiente' : 'fallido',
            timestamp: new Date(parseInt(tx.timeStamp) * 1000)
          };
        });
      }
      
      return [];
    } catch (error) {
      console.error("Error al obtener transacciones:", error);
      return [];
    }
  }
  
  /**
   * Enviar ETH
   */
  async sendEth(to: string, amount: string): Promise<string | null> {
    if (!this.signer) {
      this.message.error('Wallet no conectada');
      return null;
    }
    
    try {
      const tx = await this.signer.sendTransaction({
        to,
        value: ethers.utils.parseEther(amount)
      });
      
      this.message.success(`Transacción enviada: ${tx.hash}`);
      await tx.wait();
      this.refreshWalletData();
      return tx.hash;
    } catch (error: any) {
      this.message.error(`Error al enviar ETH: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Enviar tokens ERC20
   */
  async sendTokens(to: string, amount: string, contractAddress: string): Promise<string | null> {
    if (!this.signer || !this.provider) {
      this.message.error('Wallet no conectada');
      return null;
    }
    
    try {
      const tokenContract = new ethers.Contract(contractAddress, this.ERC20_ABI, this.signer);
      
      // Obtener decimales del token usando acceso por índice
      const decimalsBN = await tokenContract['decimals']();
      const decimals = decimalsBN.toNumber();
      
      const amountInWei = ethers.utils.parseUnits(amount, decimals);
      
      // Llamar al método transfer usando acceso por índice
      const tx = await tokenContract['transfer'](to, amountInWei);
      
      this.message.success(`Transacción de tokens enviada: ${tx.hash}`);
      await tx.wait();
      this.refreshWalletData();
      return tx.hash;
    } catch (error: any) {
      this.message.error(`Error al enviar tokens: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Verificar si la wallet está conectada
   */
  isConnected(): boolean {
    return this.provider !== null && this.signer !== null;
  }
  
  /**
   * Obtener la dirección actual
   */
  async getCurrentAddress(): Promise<string | null> {
    if (!this.signer) return null;
    try {
      return await this.signer.getAddress();
    } catch {
      return null;
    }
  }
  
  /**
   * Detectar nuevas transacciones
   * Este método se usa para verificar si hay transacciones nuevas
   */
  async checkForNewTransactions(): Promise<boolean> {
    if (!this.provider || !this.signer) {
      return false;
    }
    
    try {
      const currentBlock = await this.provider.getBlockNumber();
      
      // Si no hay cambio en el bloque, no hay nuevas transacciones
      if (currentBlock <= this.lastProcessedBlock) {
        return false;
      }
      
      // Actualizar datos si hay nuevos bloques
      await this.refreshWalletData(true);
      return true;
    } catch (error) {
      console.error("Error al verificar nuevas transacciones:", error);
      return false;
    }
  }
}

export { Transaction };
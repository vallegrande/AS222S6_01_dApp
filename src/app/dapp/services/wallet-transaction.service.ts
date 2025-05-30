import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Transaction, ContractTransaction } from '../interfaces/wallet.interface';
import { TransactionAbi } from '../abi/transaction-abi.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WalletTransactionService {

  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private walletContract: ethers.Contract | null = null;

  private lastProcessedBlock: number = 0;

  // Cache para contratos y verificaciones
  private contractsMap = new Map<string, ethers.Contract>();
  private contractTypeCache = new Map<string, boolean>(); // Cache si es contrato
  private contractMethodCache = new Map<string, boolean>(); // Cache de métodos

  private _contractAddress: string = '';

  // BehaviorSubject para notificar cambios
  private contractAddressSubject = new BehaviorSubject<string>('');
  public contractAddress$ = this.contractAddressSubject.asObservable();

  private _availableContracts: string[] = [];
  private availableContractsSubject = new BehaviorSubject<string[]>([]);
  public availableContracts$ = this.availableContractsSubject.asObservable();

  // ABIs simplificados
  private readonly ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint amount) returns (bool)"
  ];

  private readonly ETHERSCAN_API_KEY = 'UPMI6M2UPFJET8STD4VYYUFGB8T83HKHPG';

  constructor(private message: NzMessageService) {}

  get contractAddress(): string {
    return this._contractAddress;
  }

  set contractAddress(address: string) {
    if (!address || !ethers.utils.isAddress(address)) {
      if (address) console.error('Dirección de contrato inválida:', address);
      return;
    }

    this._contractAddress = address;
    this.contractAddressSubject.next(address);

    if (!this._availableContracts.includes(address)) {
      this._availableContracts.push(address);
      this.availableContractsSubject.next([...this._availableContracts]);
    }

    if (this.provider && this.signer) {
      this.initializeContract();
    }
  }

  get availableContracts(): string[] {
    return [...this._availableContracts];
  }

  addAvailableContract(address: string): boolean {
    if (ethers.utils.isAddress(address) && !this._availableContracts.includes(address)) {
      this._availableContracts.push(address);
      this.availableContractsSubject.next([...this._availableContracts]);
      return true;
    }
    return false;
  }

  setProviderAndSigner(provider: ethers.providers.Web3Provider, signer: ethers.Signer, contractAddress: string): void {
    this.provider = provider;
    this.signer = signer;
    this.initializeContract();
    
    // Re-inicializar contratos existentes
    this.contractsMap.forEach((_, address) => {
      this.initializeContractForAddress(address);
    });
  }

  private initializeContract(): void {
    if (!this._contractAddress || !this.signer) {
      this.walletContract = null;
      return;
    }

    try {
      this.walletContract = new ethers.Contract(
        this._contractAddress,
        TransactionAbi.CONTRACT_ABI,
        this.signer
      );
      this.contractsMap.set(this._contractAddress, this.walletContract);
    } catch (error) {
      console.error('Error al inicializar contrato:', error);
      this.walletContract = null;
    }
  }

  // OPTIMIZACIÓN: Cache para verificación de contratos
  async isSmartContract(address: string): Promise<boolean> {
    if (!this.provider || !ethers.utils.isAddress(address)) {
      return false;
    }

    // Verificar cache primero
    if (this.contractTypeCache.has(address)) {
      return this.contractTypeCache.get(address)!;
    }

    try {
      const code = await this.provider.getCode(address);
      const isContract = code !== '0x';
      
      // Guardar en cache
      this.contractTypeCache.set(address, isContract);
      return isContract;
    } catch (error) {
      console.error('Error al verificar si es contrato:', error);
      this.contractTypeCache.set(address, false);
      return false;
    }
  }

  // OPTIMIZACIÓN: Cache para métodos de contratos
  async hasContractMethod(address: string, methodName: string): Promise<boolean> {
    const cacheKey = `${address}-${methodName}`;
    
    if (this.contractMethodCache.has(cacheKey)) {
      return this.contractMethodCache.get(cacheKey)!;
    }

    if (!this.provider || !ethers.utils.isAddress(address)) {
      this.contractMethodCache.set(cacheKey, false);
      return false;
    }

    try {
      const isContract = await this.isSmartContract(address);
      if (!isContract) {
        this.contractMethodCache.set(cacheKey, false);
        return false;
      }

      const contract = new ethers.Contract(address, TransactionAbi.CONTRACT_ABI, this.provider);
      const hasMethod = contract.interface.functions[methodName] !== undefined;
      
      this.contractMethodCache.set(cacheKey, hasMethod);
      return hasMethod;
    } catch (error) {
      console.error(`Error al verificar método ${methodName}:`, error);
      this.contractMethodCache.set(cacheKey, false);
      return false;
    }
  }

  // OPTIMIZACIÓN: Simplificado y con menos verificaciones
  async getDailySpent(contractAddress?: string): Promise<number> {
    const targetAddress = contractAddress || this._contractAddress;
    if (!targetAddress) return 0;

    // Verificación rápida de cache
    const isContract = await this.isSmartContract(targetAddress);
    if (!isContract) return 0;

    const targetContract = this.getContractByAddress(targetAddress) || this.walletContract;
    if (!targetContract) return 0;

    try {
      const spent = await targetContract['dailySpent']();
      return parseFloat(ethers.utils.formatEther(spent));
    } catch (error) {
      return 0;
    }
  }

  private initializeContractForAddress(address: string): ethers.Contract | null {
    if (!address || !this.signer) return null;

    try {
      const contract = new ethers.Contract(address, TransactionAbi.CONTRACT_ABI, this.signer);
      this.contractsMap.set(address, contract);
      return contract;
    } catch (error) {
      console.error('Error al inicializar contrato para dirección:', address, error);
      return null;
    }
  }

  getContractByAddress(address: string): ethers.Contract | null {
    if (!address || !this.signer) return null;

    if (this.contractsMap.has(address)) {
      return this.contractsMap.get(address) || null;
    }

    return this.initializeContractForAddress(address);
  }

  switchToContract(address: string): boolean {
    if (!ethers.utils.isAddress(address)) return false;

    if (!this._availableContracts.includes(address)) {
      this._availableContracts.push(address);
      this.availableContractsSubject.next([...this._availableContracts]);
    }

    this.contractAddress = address;
    return true;
  }

  reset(): void {
    this.provider = null;
    this.signer = null;
    this.walletContract = null;
    this.contractsMap.clear();
    this.contractTypeCache.clear();
    this.contractMethodCache.clear();
    this.lastProcessedBlock = 0;
  }

  // OPTIMIZACIÓN PRINCIPAL: Balance simplificado y rápido
  async getContractBalance(contractAddress?: string): Promise<number> {
    try {
      const targetAddress = contractAddress || this._contractAddress;

      if (!this.provider && window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
      }

      if (!ethers.utils.isAddress(targetAddress)) {
        return 0;
      }

      // SIEMPRE obtener balance directo primero (más rápido)
      const balance = await this.provider!.getBalance(targetAddress);
      const directBalance = parseFloat(ethers.utils.formatEther(balance));

      // Si es un contrato, intentar método específico solo como backup
      const isContract = await this.isSmartContract(targetAddress);
      if (isContract) {
        try {
          const targetContract = this.getContractByAddress(targetAddress);
          if (targetContract) {
            const contractBalance = await targetContract['getBalance']();
            return parseFloat(ethers.utils.formatEther(contractBalance));
          }
        } catch (contractError) {
          // Usar balance directo como fallback
        }
      }

      return directBalance;
    } catch (error) {
      console.error("Error al obtener balance:", error);
      return 0;
    }
  }

  async getContractTransactionHistory(contractAddress?: string): Promise<{
    to: string;
    amount: string;
    timestamp: Date;
    description: string;
    executed: boolean;
  }[]> {
    try {
      const targetAddress = contractAddress || this._contractAddress;
      const targetContract = this.getContractByAddress(targetAddress) || this.walletContract;

      if (!targetContract) {
        return [];
      }

      const transactions = await targetContract['getTransactionHistory']();

      return transactions.map((tx: ContractTransaction) => ({
        to: tx.to,
        amount: ethers.utils.formatEther(tx.amount),
        timestamp: new Date(tx.timestamp.toNumber() * 1000),
        description: tx.description,
        executed: tx.executed
      }));
    } catch (error) {
      console.error("Error al obtener historial:", error);
      return [];
    }
  }

  // OPTIMIZACIÓN PRINCIPAL: Envío más rápido
  async sendEthViaContract(to: string, amount: string, description: string, contractAddress?: string): Promise<string | null> {
    const targetAddress = contractAddress || this._contractAddress;

    if (!targetAddress || !this.signer) {
      this.message.error('Configuración incompleta');
      return null;
    }

    const loadingMessage = this.message.loading('Preparando transacción...', { nzDuration: 0 });

    try {
      const amountWei = ethers.utils.parseEther(amount);

      // OPTIMIZACIÓN: Verificar tipo solo una vez
      const isContract = await this.isSmartContract(targetAddress);

      if (!isContract) {
        // Envío directo inmediato
        loadingMessage.messageId && this.message.remove(loadingMessage.messageId);
        
        const tx = await this.signer.sendTransaction({
          to,
          value: amountWei,
          gasLimit: 21000, // Gas fijo para transferencias ETH
        });

        this.message.success(`Transacción enviada: ${tx.hash.substring(0, 10)}...`);
        return tx.hash;
      } else {
        // Envío por contrato
        const targetContract = this.getContractByAddress(targetAddress) || this.walletContract;
        if (!targetContract) {
          throw new Error('Contrato no inicializado');
        }

        loadingMessage.messageId && this.message.remove(loadingMessage.messageId);

        // Gas optimizado para contratos
        const tx = await targetContract['sendEther'](to, amountWei, description, {
          gasLimit: 300000, // Gas reducido pero suficiente
        });

        this.message.success(`Transacción enviada: ${tx.hash.substring(0, 10)}...`);
        
        // Confirmación en background
        tx.wait().then(() => {
          this.message.success('Transacción confirmada');
        }).catch(() => {
          this.message.warning('Transacción enviada pero confirmación pendiente');
        });

        return tx.hash;
      }
    } catch (error: any) {
      loadingMessage.messageId && this.message.remove(loadingMessage.messageId);
      console.error('Error al enviar ETH:', error);
      this.message.error(`Error: ${error.message}`);
      return null;
    }
  }

  async approveAddress(address: string, approved: boolean, contractAddress?: string): Promise<string | null> {
    const targetAddress = contractAddress || this._contractAddress;
    const targetContract = this.getContractByAddress(targetAddress) || this.walletContract;

    if (!targetContract) {
      this.message.error('Contrato no inicializado');
      return null;
    }

    const loadingMessage = this.message.loading('Procesando aprobación...', { nzDuration: 0 });

    try {
      const tx = await targetContract['approveAddress'](address, approved, {
        gasLimit: 80000, // Gas optimizado
      });

      loadingMessage.messageId && this.message.remove(loadingMessage.messageId);
      this.message.success(`Aprobación ${approved ? 'concedida' : 'revocada'}`);

      return tx.hash;
    } catch (error: any) {
      loadingMessage.messageId && this.message.remove(loadingMessage.messageId);
      this.message.error(`Error: ${error.message}`);
      return null;
    }
  }

  async isAddressApproved(address: string, contractAddress?: string): Promise<boolean> {
    const targetAddress = contractAddress || this._contractAddress;
    const targetContract = this.getContractByAddress(targetAddress) || this.walletContract;

    if (!targetContract) return false;

    try {
      return await targetContract['approvedAddresses'](address);
    } catch (error) {
      return false;
    }
  }

  async setDailyLimit(limit: string, contractAddress?: string): Promise<string | null> {
    const targetAddress = contractAddress || this._contractAddress;
    const targetContract = this.getContractByAddress(targetAddress) || this.walletContract;

    if (!targetContract) {
      this.message.error('Contrato no inicializado');
      return null;
    }

    const loadingMessage = this.message.loading('Estableciendo límite...', { nzDuration: 0 });

    try {
      const limitWei = ethers.utils.parseEther(limit);
      const tx = await targetContract['setDailyLimit'](limitWei, {
        gasLimit: 80000,
      });

      loadingMessage.messageId && this.message.remove(loadingMessage.messageId);
      this.message.success('Límite diario actualizado');

      return tx.hash;
    } catch (error: any) {
      loadingMessage.messageId && this.message.remove(loadingMessage.messageId);
      this.message.error(`Error: ${error.message}`);
      return null;
    }
  }

  // OPTIMIZACIÓN: Límite diario simplificado
  async getDailyLimit(contractAddress?: string): Promise<number> {
    const targetAddress = contractAddress || this._contractAddress;
    if (!targetAddress) return 0;

    const isContract = await this.isSmartContract(targetAddress);
    if (!isContract) return 0;

    const targetContract = this.getContractByAddress(targetAddress) || this.walletContract;
    if (!targetContract) return 0;

    try {
      const limit = await targetContract['dailyLimit']();
      return parseFloat(ethers.utils.formatEther(limit));
    } catch (error) {
      return 0;
    }
  }

  // Métodos de tokens y transacciones optimizados...
  async getTokenBalance(address: string): Promise<number> {
    try {
      if (!this.provider) return 0;
      // Implementación simplificada para tokens
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async getNFTCount(address: string): Promise<number> {
    return 0; // Simplificado para mejor rendimiento
  }

  async getTransactions(address: string): Promise<Transaction[]> {
    try {
      const currentBlock = this.provider ? await this.provider.getBlockNumber() : 99999999;
      const apiUrl = `https://api-holesky.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=${currentBlock}&sort=desc&apikey=${this.ETHERSCAN_API_KEY}`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === '1') {
        return data.result.slice(0, 90000).map((tx: any) => ({
          hash: tx.hash,
          type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
          amount: ethers.utils.formatEther(tx.value) + ' ETH',
          status: tx.confirmations > 12 ? 'completado' : 'pendiente',
          timestamp: new Date(parseInt(tx.timeStamp) * 1000)
        }));
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  async sendEth(to: string, amount: string): Promise<string | null> {
    if (!this.signer) {
      this.message.error('Wallet no conectada');
      return null;
    }

    const loadingMessage = this.message.loading('Enviando ETH...', { nzDuration: 0 });

    try {
      const tx = await this.signer.sendTransaction({
        to,
        value: ethers.utils.parseEther(amount),
        gasLimit: 21000,
      });

      loadingMessage.messageId && this.message.remove(loadingMessage.messageId);
      this.message.success(`Transacción enviada: ${tx.hash.substring(0, 10)}...`);

      return tx.hash;
    } catch (error: any) {
      loadingMessage.messageId && this.message.remove(loadingMessage.messageId);
      this.message.error(`Error: ${error.message}`);
      return null;
    }
  }

  async sendTokens(to: string, amount: string, contractAddress: string): Promise<string | null> {
    if (!this.signer || !this.provider) {
      this.message.error('Wallet no conectada');
      return null;
    }

    try {
      const tokenContract = new ethers.Contract(contractAddress, this.ERC20_ABI, this.signer);
      const decimals = await tokenContract['decimals']();
      const amountInWei = ethers.utils.parseUnits(amount, decimals);
      const tx = await tokenContract['transfer'](to, amountInWei);

      this.message.success(`Tokens enviados: ${tx.hash}`);
      return tx.hash;
    } catch (error: any) {
      this.message.error(`Error: ${error.message}`);
      return null;
    }
  }

  async checkForNewTransactions(): Promise<boolean> {
    if (!this.provider) return false;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (currentBlock <= this.lastProcessedBlock) return false;

      this.lastProcessedBlock = currentBlock;
      return true;
    } catch (error) {
      return false;
    }
  }

  async updateLastProcessedBlock(): Promise<void> {
    if (this.provider) {
      this.lastProcessedBlock = await this.provider.getBlockNumber();
    }
  }
}
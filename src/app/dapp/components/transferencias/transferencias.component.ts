import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ethers } from 'ethers';
import { Subscription } from 'rxjs';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { TranslateModule, TranslateService } from '@ngx-translate/core';


// Interfaces
import { ContactData, WalletInterface, SendEtherParams } from '../../interfaces/wallet.interface';

// Servicios
import { WalletService } from '../../services/wallet.service';
import { WalletTransactionService } from '../../services/wallet-transaction.service';
import Web3 from 'web3';

@Component({
  selector: 'app-transferencias',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormsModule,
    NzLayoutModule,
    NzGridModule,
    NzCardModule,
    NzIconModule,
    NzButtonModule,
    NzDividerModule,
    NzFormModule,
    NzInputModule,
    NzTypographyModule,
    NzSpinModule,
    NzAlertModule,
    NzStatisticModule,
    NzSelectModule,
    NzAvatarModule,
    NzToolTipModule,
    NzSwitchModule,
    NzModalModule,
    NzTagModule
  ],
  templateUrl: './transferencias.component.html',
  styleUrls: ['./transferencias.component.css']
})
export class TransferenciasComponent implements OnInit, OnDestroy {

  accountBalance: number = 0;
  contractBalance: number = 0;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  transferForm!: FormGroup;
  contractAddressForm!: FormGroup;
  isSendingTransfer: boolean = false;
  selectedContact: string | null = null;
  useContract: boolean = false;

  walletAddress: string = '';
  contractAddress: string = '';
  isContractDataLoading: boolean = false;
  isContractConfigured: boolean = false;
  dailyLimit: number = 0;
  dailySpent: number = 0;

  // Simplificado - solo necesitamos saber si es contrato o no
  isAddressSmartContract: boolean = false;
  contractName: string = 'Contrato Ciskoi'; // Nombre personalizado
  addressType: 'wallet' | 'contract' | 'unknown' = 'unknown';

  contacts: ContactData[] = [];

  // Modal para configurar contrato
  isContractModalVisible: boolean = false;
  isTestingContract: boolean = false;

  // Cache simple para verificaciones
  private addressTypeCache = new Map<string, boolean>();

  private walletSubscription?: Subscription;
  private walletData: WalletInterface | null = null;

  constructor(
    private fb: FormBuilder,
    private message: NzMessageService,
    private walletService: WalletService,
    private walletTransactionService: WalletTransactionService,
    private translate: TranslateService

  ) {
    this.createForms();
  }

  createForms(): void {
    this.transferForm = this.fb.group({
      recipient: ['', [Validators.required, this.ethereumAddressValidator]],
      amount: [null, [Validators.required, Validators.min(0.000001)]],
      description: ['', [Validators.maxLength(100)]]
    });

    this.contractAddressForm = this.fb.group({
      address: ['', [Validators.required, this.ethereumAddressValidator]]
    });
  }

  private ethereumAddressValidator(control: any) {
    const value = control.value;
    if (!value) {
      return null;
    }

    const isValid = Web3.utils.isAddress(value);
    return isValid ? null : { invalidAddress: true };
  }

  async ngOnInit(): Promise<void> {
    try {
      this.loadContacts();
      this.loadSavedContractAddress();

      this.walletSubscription = this.walletService.wallet$.subscribe(
        async (walletData) => {
          this.walletData = walletData;
          if (walletData) {
            this.walletAddress = walletData.address;
            this.accountBalance = walletData.balance;
            this.errorMessage = null;

            // Inicialización simplificada y asíncrona
            if (this.isContractConfigured) {
              this.initializeContractAsync();
            }
          } else {
            this.resetWalletData();
          }
        }
      );

      if (this.walletService.isConnected()) {
        this.refreshWalletData();
      }
    } catch (error: any) {
      console.error('Error al inicializar:', error);
      this.errorMessage = 'Error al conectar con la billetera.';
    }
  }

  ngOnDestroy(): void {
    if (this.walletSubscription) {
      this.walletSubscription.unsubscribe();
    }
  }

  resetWalletData(): void {
    this.walletAddress = '';
    this.accountBalance = 0;
    this.contractBalance = 0;
    this.dailyLimit = 0;
    this.dailySpent = 0;
    this.walletTransactionService.reset();
  }

  loadSavedContractAddress(): void {
    try {
      const savedAddress = localStorage.getItem('contract-address');
      if (savedAddress && Web3.utils.isAddress(savedAddress)) {
        this.contractAddress = savedAddress;
        this.isContractConfigured = true;
        this.contractAddressForm.patchValue({ address: savedAddress });

        // Verificar tipo de forma asíncrona
        this.checkAddressTypeAsync(savedAddress);
      }
    } catch (error) {
      console.error('Error al cargar dirección del contrato:', error);
    }
  }

  saveContractAddress(address: string): void {
    try {
      localStorage.setItem('contract-address', address);
    } catch (error) {
      console.error('Error al guardar dirección del contrato:', error);
    }
  }

  // Inicialización asíncrona sin bloquear la UI
  private async initializeContractAsync(): Promise<void> {
    if (!this.contractAddress) return;

    try {
      const provider = this.walletService.providerInstance;
      const signer = this.walletService.signerInstance;

      if (provider && signer) {
        this.walletTransactionService.setProviderAndSigner(
          provider,
          signer,
          this.contractAddress
        );

        // Cargar datos en background
        setTimeout(() => {
          this.loadContractDataAsync();
        }, 100);
      }
    } catch (error) {
      console.error('Error al inicializar contrato:', error);
    }
  }

  // Verificación de tipo de dirección en background
  private async checkAddressTypeAsync(address: string): Promise<void> {
    if (this.addressTypeCache.has(address)) {
      this.isAddressSmartContract = this.addressTypeCache.get(address)!;
      this.addressType = this.isAddressSmartContract ? 'contract' : 'wallet';
      return;
    }

    try {
      const provider = this.walletService.providerInstance;
      if (!provider) return;

      const code = await provider.getCode(address);
      const isContract = code !== '0x';

      this.isAddressSmartContract = isContract;
      this.addressType = isContract ? 'contract' : 'wallet';
      this.addressTypeCache.set(address, isContract);
    } catch (error) {
      console.error('Error al verificar tipo de dirección:', error);
      this.isAddressSmartContract = false;
      this.addressType = 'unknown';
    }
  }

  showContractModal(): void {
    this.isContractModalVisible = true;
    if (this.contractAddress) {
      this.contractAddressForm.patchValue({ address: this.contractAddress });
    }
  }

  hideContractModal(): void {
    this.isContractModalVisible = false;
    this.contractAddressForm.reset();
    this.isTestingContract = false;
  }

  async testContract(): Promise<void> {
    if (!this.contractAddressForm.valid) {
      this.message.warning('Por favor ingresa una dirección válida');
      return;
    }

    const address = this.contractAddressForm.value.address;
    this.isTestingContract = true;

    try {
      const provider = this.walletService.providerInstance;
      if (!provider) {
        throw new Error('No hay conexión con el proveedor de red');
      }

      // Verificación rápida de balance
      const balance = await provider.getBalance(address);
      const balanceEth = parseFloat(ethers.utils.formatEther(balance));

      // Verificación simple de tipo
      const code = await provider.getCode(address);
      const isContract = code !== '0x';

      this.isAddressSmartContract = isContract;
      this.addressType = isContract ? 'contract' : 'wallet';
      this.addressTypeCache.set(address, isContract);

      let typeMessage = isContract ?
        `${this.contractName} (Contrato Inteligente detectado)` :
        'Wallet normal detectada';

      this.message.success(
        `Dirección verificada: ${typeMessage}. Balance: ${balanceEth.toFixed(6)} ETH`,
        { nzDuration: 5000 }
      );

      // Configurar
      this.contractAddress = address;
      this.isContractConfigured = true;
      this.saveContractAddress(address);
      this.hideContractModal();

      // Inicializar en background
      if (this.walletService.isConnected()) {
        this.initializeContractAsync();
      }

    } catch (error: any) {
      console.error('Error al verificar la dirección:', error);
      this.message.error(`Error al verificar la dirección: ${error.message || 'Error desconocido'}`);
    } finally {
      this.isTestingContract = false;
    }
  }

  removeContract(): void {
    this.contractAddress = '';
    this.isContractConfigured = false;
    this.useContract = false;
    this.contractBalance = 0;
    this.dailyLimit = 0;
    this.dailySpent = 0;
    this.isAddressSmartContract = false;
    this.addressType = 'unknown';
    localStorage.removeItem('contract-address');
    this.walletTransactionService.reset();
    this.message.success('Configuración eliminada');
  }

  async connectWallet(): Promise<void> {
    this.isLoading = true;
    try {
      const address = await this.walletService.connectWallet();
      if (address) {
        this.message.success('Wallet conectada correctamente');
      } else {
        throw new Error('No se pudo conectar la wallet');
      }
    } catch (error: any) {
      console.error(error);
      this.errorMessage = 'Error al conectar con la billetera.';
    } finally {
      this.isLoading = false;
    }
  }

  async refreshWalletData(): Promise<void> {
    try {
      await this.walletService.refreshWalletData();
      if (this.walletService.isConnected() && this.isContractConfigured) {
        this.loadContractDataAsync();
      }
    } catch (error: any) {
      console.error('Error al actualizar datos:', error);
      this.message.warning('No se pudo actualizar la información');
    }
  }

  // Carga de datos del contrato optimizada y asíncrona
  private async loadContractDataAsync(): Promise<void> {
    if (!this.walletService.isConnected() || !this.isContractConfigured) return;

    this.isContractDataLoading = true;

    try {
      const provider = this.walletService.providerInstance;
      if (!provider) return;

      if (this.useContract) {
        // Obtener balance directo (más rápido)
        const balance = await provider.getBalance(this.contractAddress);
        this.contractBalance = parseFloat(ethers.utils.formatEther(balance));

        // Si es contrato, intentar obtener límites en background
        if (this.isAddressSmartContract) {
          this.loadContractLimitsAsync();
        }
      } else {
        // Usar balance de la wallet conectada
        if (this.walletData) {
          this.contractBalance = this.walletData.balance;
        }
      }
    } catch (error: any) {
      console.error('Error al cargar datos:', error);
      // Fallback al balance de la wallet principal
      if (this.walletData) {
        this.contractBalance = this.walletData.balance;
      }
    } finally {
      this.isContractDataLoading = false;
    }
  }

  // Carga de límites en background sin bloquear
  private async loadContractLimitsAsync(): Promise<void> {
    try {
      if (!this.isAddressSmartContract) {
        this.dailyLimit = 0;
        this.dailySpent = 0;
        return;
      }

      // Intentar cargar límites con timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );

      const limitsPromise = Promise.all([
        this.walletTransactionService.getDailyLimit(),
        this.walletTransactionService.getDailySpent()
      ]);

      try {
        const [dailyLimit, dailySpent] = await Promise.race([limitsPromise, timeoutPromise]) as [number, number];
        this.dailyLimit = dailyLimit || 0;
        this.dailySpent = dailySpent || 0;
      } catch (timeoutError) {
        console.log('Timeout al cargar límites, usando valores por defecto');
        this.dailyLimit = 0;
        this.dailySpent = 0;
      }
    } catch (error: any) {
      console.error('Error al cargar límites:', error);
      this.dailyLimit = 0;
      this.dailySpent = 0;
    }
  }

  loadContacts(): void {
    try {
      const savedContacts = localStorage.getItem('wallet-contacts');
      if (savedContacts) {
        this.contacts = JSON.parse(savedContacts);
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error);
    }
  }

  async sendTransaction(): Promise<void> {
    if (!this.transferForm.valid) {
      this.markFormGroupTouched(this.transferForm);
      this.message.warning('Por favor complete todos los campos correctamente');
      return;
    }

    if (this.useContract && !this.isContractConfigured) {
      this.message.error('Por favor configura la dirección primero');
      return;
    }

    this.isSendingTransfer = true;

    try {
      const values = this.transferForm.value;
      const toAddress = values.recipient;
      const amountNumber = parseFloat(values.amount);

      // Validaciones básicas
      if (isNaN(amountNumber) || amountNumber <= 0) {
        throw new Error('La cantidad debe ser mayor que 0');
      }

      if (!Web3.utils.isAddress(toAddress)) {
        throw new Error('La dirección de destinatario no es válida');
      }

      // Validar balance
      const availableBalance = this.useContract ? this.contractBalance : this.accountBalance;
      if (amountNumber > availableBalance) {
        throw new Error(`Fondos insuficientes. Disponible: ${availableBalance.toFixed(4)} ETH`);
      }

      const amount = amountNumber.toString();
      const description = values.description || `Transferencia desde ${this.contractName}`;

      let txHash: string | null = null;

      // Mostrar mensaje inmediato
      const loadingMsg = this.message.loading('Preparando transacción...', { nzDuration: 0 });

      if (this.useContract) {
        console.log(`Enviando a través de ${this.contractName}:`, this.contractAddress);

        if (this.isAddressSmartContract) {
          // Contrato inteligente
          console.log(`Usando ${this.contractName} para el envío`);
          try {
            txHash = await this.walletTransactionService.sendEthViaContract(
              toAddress,
              amount,
              description
            );
          } catch (contractError) {
            console.warn('Error en contrato, usando envío directo:', contractError);
            txHash = await this.walletService.sendEth(toAddress, amount);
            this.message.warning('Enviado directamente (contrato no disponible)');
          }
        } else {
          // Wallet normal
          console.log('Enviando desde wallet configurada');
          txHash = await this.walletService.sendEth(toAddress, amount);
        }
      } else {
        console.log('Enviando directamente desde wallet conectada');
        txHash = await this.walletService.sendEth(toAddress, amount);
      }

      // Remover mensaje de carga
      if (loadingMsg.messageId) {
        this.message.remove(loadingMsg.messageId);
      }

      if (txHash) {
        this.message.success(`¡Transacción enviada exitosamente!`, { nzDuration: 5000 });
        console.log('Transaction hash:', txHash);

        // Resetear formulario
        this.transferForm.reset();
        this.selectedContact = null;

        // Actualizar datos en background
        setTimeout(() => {
          this.refreshWalletData();
        }, 2000);
      } else {
        throw new Error('No se pudo completar la transacción');
      }
    } catch (error: any) {
      console.error('Error en la transferencia:', error);

      let errorMessage = 'Error desconocido';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      }

      this.message.error(`Error: ${errorMessage}`);
    } finally {
      this.isSendingTransfer = false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });
  }

  toggleUseContract(): void {
    if (!this.isContractConfigured) {
      this.message.warning('Por favor configura una dirección primero');
      this.useContract = false;
      return;
    }

    this.useContract = !this.useContract;

    if (this.useContract) {
      const typeMsg = this.isAddressSmartContract ?
        `Usando ${this.contractName}` :
        'Usando wallet configurada';
      this.message.info(typeMsg);
    } else {
      this.message.info('Modo directo activado');
    }

    // Cargar datos de forma asíncrona
    this.loadContractDataAsync();
  }

  selectContact(walletAddress: string): void {
    if (walletAddress) {
      this.transferForm.patchValue({
        recipient: walletAddress
      });
      this.selectedContact = walletAddress;
    }
  }

  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  getContactName(address: string): string | null {
    if (!address) return null;
    const contact = this.contacts.find(c =>
      c.walletAddress.toLowerCase() === address.toLowerCase()
    );
    return contact ? contact.name : null;
  }

  isWalletConnected(): boolean {
    return this.walletService.isConnected();
  }

  disconnectWallet(): void {
    this.walletService.disconnectWallet();
    this.resetWalletData();
  }

  getDailyLimitPercentage(): number {
    if (this.dailyLimit <= 0) return 0;
    return (this.dailySpent / this.dailyLimit) * 100;
  }

  getContractStatus(): string {
    if (!this.isContractConfigured) {
      return 'No configurado';
    }

    if (this.isAddressSmartContract) {
      return this.contractName;
    } else {
      return 'Wallet configurada';
    }
  }

  getAddressTypeInfo(): string {
    if (!this.isContractConfigured) {
      return '';
    }

    if (this.isAddressSmartContract) {
      return `${this.contractName} - Contrato inteligente activo`;
    } else {
      return 'Wallet normal (EOA) - Transferencias directas';
    }
  }

  canUseDailyLimits(): boolean {
    return this.isContractConfigured && this.isAddressSmartContract && this.dailyLimit > 0;
  }
}
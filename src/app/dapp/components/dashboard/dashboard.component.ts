import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, interval } from 'rxjs';

import { WalletService, Transaction } from '../../services/wallet.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzGridModule,
    NzStatisticModule,
    NzDividerModule,
    NzTableModule,
    NzIconModule,
    NzTagModule,
    NzButtonModule,
    NzTypographyModule,
    NzModalModule,
    NzMessageModule,
    NzFormModule,
    NzInputModule,
    NzRadioModule,
    NzSpinModule,
    NzBadgeModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  accountBalance: number = 0;
  tokenBalance: number = 0;
  nftCount: number = 0;
  transactionCount: number = 0;
  walletAddress: string = '';
  
  transactions: Transaction[] = [];
  
  // Modal de transferencia
  isTransferModalVisible = false;
  isTransferLoading = false;
  transferForm: FormGroup;
  
  // Token contract address
  tokenContractAddress: string = '';
  
  // Indicador de carga de datos
  isLoading: boolean = false;
  
  // Indicador de nuevas transacciones
  hasNewTransactions: boolean = false;
  
  // Opciones de paginación
  pageSize: number = 10;
  pageIndex: number = 1;
  
  // Suscripción a los datos de la wallet
  private walletSubscription?: Subscription;
  
  // Suscripción para comprobar nuevas transacciones
  private refreshSubscription?: Subscription;

  constructor(
    private walletService: WalletService,
    private fb: FormBuilder,
    private message: NzMessageService
  ) {
    this.transferForm = this.fb.group({
      transferType: ['eth', [Validators.required]],
      address: ['', [Validators.required, Validators.pattern(/^0x[a-fA-F0-9]{40}$/)]],
      amount: ['', [Validators.required, Validators.min(0.00001)]]
    });
  }

  ngOnInit(): void {
    // Suscribirse a los cambios en la wallet
    this.walletSubscription = this.walletService.wallet$.subscribe(wallet => {
      if (wallet) {
        this.accountBalance = wallet.balance;
        this.tokenBalance = wallet.tokenBalance;
        this.nftCount = wallet.nftCount;
        this.transactionCount = wallet.transactionCount;
        
        // Comprobar si hay nuevas transacciones
        const prevTxCount = this.transactions.length;
        this.transactions = wallet.transactions;
        
        if (prevTxCount > 0 && this.transactions.length > prevTxCount) {
          this.hasNewTransactions = true;
          // Mostrar un indicador visual
          this.message.success('¡Nuevas transacciones detectadas!');
          
          // Resetear el indicador después de 5 segundos
          setTimeout(() => {
            this.hasNewTransactions = false;
          }, 5000);
        }
        
        this.walletAddress = wallet.address;
        this.isLoading = false;
      } else {
        // Si no hay wallet conectada, intentar conectar
        this.connectWallet();
      }
    });
    
    // Configurar actualización cada 15 segundos para la interfaz de usuario
    this.refreshSubscription = interval(15000).subscribe(() => {
      this.checkForUpdates();
    });
  }
  
  ngOnDestroy(): void {
    // Cancelar suscripciones al destruir el componente
    if (this.walletSubscription) {
      this.walletSubscription.unsubscribe();
    }
    
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }
  
  async connectWallet(): Promise<void> {
    this.isLoading = true;
    await this.walletService.connectWallet();
    this.isLoading = false;
  }
  
  refreshWalletData(): void {
    this.isLoading = true;
    this.walletService.refreshWalletData();
  }
  
  showTransferModal(): void {
    this.isTransferModalVisible = true;
  }
  
  handleCancelTransfer(): void {
    this.isTransferModalVisible = false;
    this.transferForm.reset({
      transferType: 'eth',
      address: '',
      amount: ''
    });
  }
  
  async handleOkTransfer(): Promise<void> {
    if (this.transferForm.valid) {
      this.isTransferLoading = true;
      
      const { transferType, address, amount } = this.transferForm.value;
      
      try {
        let txHash: string | null = null;
        
        if (transferType === 'eth') {
          txHash = await this.walletService.sendEth(address, amount.toString());
        } else if (transferType === 'token') {
          // Utilizamos la dirección del contrato token para CISKOI
          // Debes reemplazarlo con la dirección real del token
          const tokenAddress = this.tokenContractAddress || '0x123456789abcdef123456789abcdef12345678';
          txHash = await this.walletService.sendTokens(address, amount.toString(), tokenAddress);
        }
        
        if (txHash) {
          this.isTransferModalVisible = false;
          this.transferForm.reset({
            transferType: 'eth',
            address: '',
            amount: ''
          });
          
          // Mostrar mensaje de éxito
          this.message.success('¡Transferencia enviada con éxito!');
          
          // Actualizar datos manualmente después de enviar
          setTimeout(() => {
            this.refreshWalletData();
          }, 2000);
        }
      } finally {
        this.isTransferLoading = false;
      }
    } else {
      Object.values(this.transferForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }
  
  // Comprobar si hay actualizaciones
  async checkForUpdates(): Promise<void> {
    // Evitar múltiples llamadas simultáneas
    if (this.isLoading) {
      return;
    }
    
    try {
      // Solicita una actualización silenciosa
      this.walletService.refreshWalletData();
    } catch (error) {
      console.error('Error al verificar actualizaciones:', error);
    }
  }
  
  // Controla el cambio de página
  onPageIndexChange(index: number): void {
    this.pageIndex = index;
  }
  
  // Controla el cambio de tamaño de página
  onPageSizeChange(size: number): void {
    this.pageSize = size;
  }
  
  // Formatear dirección ETH
  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
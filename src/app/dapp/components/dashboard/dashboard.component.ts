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
import { Subscription, interval, take } from 'rxjs';
import { Transaction } from '../../interfaces/wallet.interface';
import { NetworkSelectorComponent } from '../networkselector/networkselector.component';

import { RutasService } from '../../services/rutas.service';
import { WalletService } from '../../services/wallet.service';
import { NzMessageService } from 'ng-zorro-antd/message';

import { TranslateModule, TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
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
    NzBadgeModule,
    NetworkSelectorComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  getStatusTranslation(status: string): string {
    const statusTranslations: { [key: string]: string } = {
      'completado': this.translate.instant('dashboard.transacciones.estados.completado'),
      'pendiente': this.translate.instant('dashboard.transacciones.estados.pendiente'),
      'fallido': this.translate.instant('dashboard.transacciones.estados.fallido'),
      'failed': this.translate.instant('dashboard.transacciones.estados.fallido'),
      'completed': this.translate.instant('dashboard.transacciones.estados.completado'),
      'pending': this.translate.instant('dashboard.transacciones.estados.pendiente')
    };

    return statusTranslations[status.toLowerCase()] || status;
  }

  accountBalance: number = 0;
  tokenBalance: number = 0;
  nftCount: number = 0;
  transactionCount: number = 0;
  walletAddress: string = '';

  transactions: Transaction[] = [];

  private networkSubscription?: Subscription;
  private ethereumSubscription?: Subscription;

  currentNetwork: string = '';

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
    private message: NzMessageService,
    private rutasService: RutasService, // Servicio de rutas para la integración con el NetworkSelector
    private translate: TranslateService // AGREGAR ESTE SERVICIO

  ) {
    this.transferForm = this.fb.group({
      transferType: ['eth', [Validators.required]],
      address: ['', [Validators.required, Validators.pattern(/^0x[a-fA-F0-9]{40}$/)]],
      amount: ['', [Validators.required, Validators.min(0.00001)]]
    });
  }

  ngOnInit(): void {
    this.initializeTranslations(); // CORREGIDO: quitar coma y agregar paréntesis

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
          this.message.success(this.translate.instant('dashboard.mensajes.nuevas_transacciones'));

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

    // Resto del código ngOnInit...
    // Suscribirse a los cambios en la red actual
    this.networkSubscription = this.rutasService.currentNetwork$.subscribe(network => {
      if (network) {
        // Actualizar la interfaz cuando cambia la red
        this.currentNetwork = network.name;

        // Refrescar datos de la wallet al cambiar de red
        setTimeout(() => {
          this.refreshWalletData();
        }, 1000);
      }
    });

    // Configurar actualización cada 15 segundos para la interfaz de usuario
    this.refreshSubscription = interval(15000).subscribe(() => {
      this.checkForUpdates();
    });

    // Escuchar eventos de cambio de red directamente desde el proveedor Ethereum
    if (window.ethereum) {
      this.listenToEthereumEvents();
    }
  }

  private initializeTranslations(): void {
    // Cargar idioma guardado o usar español por defecto
    const idiomaGuardado = localStorage.getItem('idioma-preferido') || 'es';

    this.translate.setDefaultLang('es');
    this.translate.use(idiomaGuardado);

    // Debug para verificar que las traducciones funcionan
    console.log('Idioma actual:', this.translate.currentLang);

    // Suscribirse a cambios de idioma para actualizar la interfaz
    this.translate.onLangChange.subscribe(() => {
      console.log('Idioma cambiado a:', this.translate.currentLang);
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

    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe();
    }

    if (this.ethereumSubscription) {
      this.ethereumSubscription.unsubscribe();
    }

    // Remover listeners de eventos de Ethereum
    this.removeEthereumListeners();
  }

  /**
   * Escuchar eventos directamente desde el proveedor de Ethereum (MetaMask)
   */

  private listenToEthereumEvents(): void {
    if (window.ethereum) {
      // Escuchar evento de cambio de red
      window.ethereum.on('chainChanged', (chainId: string) => {
        console.log('Red cambiada a:', chainId);

        // Actualizar la red actual mediante el servicio de rutas
        this.rutasService.detectCurrentNetwork().then(network => {
          if (network) {
            console.log('Red detectada:', network.name);
          }
        });
      });

      // Escuchar evento de cambio de cuenta
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log('Cuentas cambiadas:', accounts);

        // Si hay cuentas disponibles, actualizar la wallet
        if (accounts.length > 0) {
          // Esperar un momento antes de actualizar
          setTimeout(() => {
            this.refreshWalletData();
          }, 500);
        } else {
          // Si no hay cuentas, intentar conectar de nuevo
          // pero no redireccionar a la página principal
          this.connectWallet();
        }
      });
    }
  }

  /**
   * Eliminar los listeners de eventos de Ethereum para evitar memory leaks
   */
  private removeEthereumListeners(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('chainChanged');
      window.ethereum.removeAllListeners('accountsChanged');
    }
  }

  async connectWallet(): Promise<void> {
    this.isLoading = true;
    try {
      const address = await this.walletService.connectWallet();
      if (!address) {
        this.message.warning('No se pudo conectar la wallet. Permaneciendo en la página actual.');
      }
    } catch (error) {
      console.error('Error al conectar wallet:', error);
      this.message.error('No se pudo conectar la wallet');
    } finally {
      this.isLoading = false;
    }
  }

  refreshWalletData(): void {
    this.isLoading = true;
    try {
      this.walletService.refreshWalletData();
    } catch (error) {
      console.error('Error al refrescar datos:', error);
      this.message.error('Error al actualizar los datos');
      this.isLoading = false; // Asegurarse de quitar el estado de carga en caso de error
    }
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
          // Utilizamos la dirección del contrato token para el token
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
      } catch (error) {
        console.error('Error en la transferencia:', error);
        this.message.error('Error al realizar la transferencia');
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

  // Obtener la URL del explorador para la red actual
  getExplorerUrl(txHash: string): string {
    return this.rutasService.getTransactionExplorerUrl(txHash);
  }
}
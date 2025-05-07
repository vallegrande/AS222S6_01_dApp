import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ethers } from 'ethers';
import { Subscription } from 'rxjs';

// NG-ZORRO
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

// Interfaces
import { ContactData, WalletInterface } from '../../interfaces/wallet.interface';

// Servicios
import { WalletService } from '../../services/wallet.service';


@Component({
  selector: 'app-transferencias',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    NzToolTipModule
  ],
  templateUrl: './transferencias.component.html',
  styleUrls: ['./transferencias.component.css']
})
export class TransferenciasComponent implements OnInit, OnDestroy {
  // Variables para mostrar información
  accountBalance: number = 0;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  // Variables para transferencia directa
  transferForm!: FormGroup;
  isSendingTransfer: boolean = false;
  selectedContact: string | null = null;

  // Variables para el contrato
  walletAddress: string = '';
  contractAddress: string = '0x1234567890123456789012345678901234567890';
  
  // Contactos
  contacts: ContactData[] = [];
  
  // Subscripción para el observable del wallet
  private walletSubscription?: Subscription;
  private walletData: WalletInterface | null = null;

  constructor(
    private fb: FormBuilder,
    private message: NzMessageService,
    private walletService: WalletService
  ) {
    this.createForm();
  }

  createForm(): void {
    this.transferForm = this.fb.group({
      recipient: ['', [Validators.required, Validators.pattern(/^0x[a-fA-F0-9]{40}$/)]],
      amount: [null, [Validators.required, Validators.min(0.000001)]]
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.loadContacts();
      
      // Suscribirse a los cambios en el wallet
      this.walletSubscription = this.walletService.wallet$.subscribe(
        (walletData) => {
          this.walletData = walletData;
          if (walletData) {
            this.walletAddress = walletData.address;
            this.accountBalance = walletData.balance;
            this.errorMessage = null;
          } else {
            this.walletAddress = '';
            this.accountBalance = 0;
          }
        }
      );
      
      // Verificar si ya hay una conexión activa
      if (this.walletService.isConnected()) {
        this.refreshWalletData();
      }
    } catch (error: any) {
      console.error('Error al inicializar:', error);
      this.errorMessage = 'Error al conectar con la billetera. Por favor, asegúrate de tener MetaMask instalado y desbloqueado.';
    }
  }
  
  ngOnDestroy(): void {
    // Cancelar la suscripción cuando el componente se destruye
    if (this.walletSubscription) {
      this.walletSubscription.unsubscribe();
    }
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
      this.errorMessage = 'Error al conectar con la billetera. Por favor, instala MetaMask y actualiza la página.';
    } finally {
      this.isLoading = false;
    }
  }

  async refreshWalletData(): Promise<void> {
    try {
      await this.walletService.refreshWalletData();
    } catch (error: any) {
      console.error('Error al actualizar datos de la wallet:', error);
      this.message.warning('No se pudo actualizar la información de la wallet');
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
      this.message.error('No se pudieron cargar los contactos');
    }
  }

  async sendTransaction(): Promise<void> {
    if (this.transferForm.valid) {
      this.isSendingTransfer = true;
  
      try {
        const values = this.transferForm.value;
        const toAddress = values.recipient;
        const amount = values.amount.toString();
        
        // Validar que la dirección sea correcta
        if (!ethers.utils.isAddress(toAddress)) {
          throw new Error('La dirección de destinatario no es válida');
        }
        
        // Enviar la transacción utilizando el servicio de wallet
        const txHash = await this.walletService.sendEth(toAddress, amount);
        
        if (txHash) {
          this.message.success(`Transferencia enviada con éxito. Hash: ${txHash}`);
          
          // Actualizar datos de la wallet
          await this.refreshWalletData();
          
          // Resetear formulario
          this.transferForm.reset();
          this.selectedContact = null;
        } else {
          throw new Error('No se pudo completar la transacción');
        }
      } catch (error: any) {
        console.error('Error en la transferencia:', error);
        this.message.error(`Error al realizar la transferencia: ${error.message || 'Revise los datos e intente nuevamente'}`);
      } finally {
        this.isSendingTransfer = false;
      }
    } else {
      Object.values(this.transferForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      this.message.warning('Por favor complete todos los campos correctamente');
    }
  }

  selectContact(walletAddress: string): void {
    if (walletAddress) {
      this.transferForm.patchValue({
        recipient: walletAddress
      });
      this.selectedContact = walletAddress;
    }
  }

  // Método para formatear la dirección Ethereum
  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Resolver nombre del contacto a partir de la dirección
  getContactName(address: string): string | null {
    if (!address) return null;
    const contact = this.contacts.find(c =>
      c.walletAddress.toLowerCase() === address.toLowerCase()
    );
    return contact ? contact.name : null;
  }
  
  // Verificar si la wallet está conectada
  isWalletConnected(): boolean {
    return this.walletService.isConnected();
  }
  
  // Desconectar wallet
  disconnectWallet(): void {
    this.walletService.disconnectWallet();
  }
}
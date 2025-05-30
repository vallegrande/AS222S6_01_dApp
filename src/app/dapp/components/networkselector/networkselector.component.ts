import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FormsModule } from '@angular/forms';
import { RutasService, NetworkInfo } from '../../services/rutas.service';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-networkselector',
  standalone: true,
  imports: [
    CommonModule,
    NzSelectModule,
    NzTagModule,
    FormsModule
  ],
  templateUrl: './networkselector.component.html',
  styleUrls: ['./networkselector.component.css']
})
export class NetworkSelectorComponent implements OnInit, OnDestroy {
  currentNetwork: NetworkInfo | null = null;
  selectedNetworkId: string = '';
  mainnetNetworks: NetworkInfo[] = [];
  testnetNetworks: NetworkInfo[] = [];
  
  private networkSubscription?: Subscription;
  private chainChangedSubscription?: Subscription;
  public networkChangeInProgress: boolean = false;
  
  constructor(private rutasService: RutasService) { }
  
  ngOnInit(): void {
    // Configurar preservación del estado al cambiar de red
    this.rutasService.setPreserveState(true);
    
    // Cargar las redes disponibles
    this.mainnetNetworks = this.rutasService.getMainnets();
    this.testnetNetworks = this.rutasService.getTestnets();
      
    // Suscribirse a cambios en la red actual
    this.networkSubscription = this.rutasService.currentNetwork$.subscribe(network => {
      // Solo actualizar si hay un cambio real o es la primera carga
      if (!this.currentNetwork || (network && this.currentNetwork.id !== network.id)) {
        this.currentNetwork = network;
        this.selectedNetworkId = network.id;
      }
      
      // Marcar como que ya no hay cambio de red en progreso
      this.networkChangeInProgress = false;
    });
      
    // Detectar la red actual al inicializar
    this.rutasService.detectCurrentNetwork();
    
    // Escuchar eventos de cambio de cadena directamente de Ethereum
    if (window.ethereum) {
      // Eliminar listeners anteriores para evitar duplicados
      window.ethereum.removeAllListeners('chainChanged');
      
      window.ethereum.on('chainChanged', (_chainId: string) => {
        // Marcar que hay un cambio de red en progreso
        this.networkChangeInProgress = true;
        
        // Configurar para preservar el estado
        this.rutasService.setPreserveState(true);
        
        // Esperar un momento antes de detectar la nueva red
        // para asegurar que MetaMask ha completado el cambio
        this.chainChangedSubscription = timer(1000).subscribe(() => {
          this.detectCurrentNetwork();
        });
      });
    }
  }
  
  ngOnDestroy(): void {
    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe();
    }
    
    if (this.chainChangedSubscription) {
      this.chainChangedSubscription.unsubscribe();
    }
    
    // Eliminar listeners de eventos para evitar memory leaks
    if (window.ethereum) {
      window.ethereum.removeAllListeners('chainChanged');
    }
  }
  
  async onNetworkChange(networkId: string): Promise<void> {
    // Evitar cambios múltiples simultáneos
    if (this.networkChangeInProgress || !networkId) {
      return;
    }
    
    // Si seleccionamos la misma red, no hacer nada
    if (this.currentNetwork && this.currentNetwork.id === networkId) {
      return;
    }
    
    this.networkChangeInProgress = true;
    
    try {
      // Asegurarnos de preservar el estado al cambiar la red
      this.rutasService.setPreserveState(true);
      
      // Intentar cambiar la red
      await this.rutasService.switchNetwork(networkId);
      
      // La actualización de la UI se manejará a través de la suscripción
      // a currentNetwork$ cuando se complete el cambio de red
    } catch (error) {
      console.error('Error al cambiar de red:', error);
      this.networkChangeInProgress = false;
      
      // Restaurar la selección previa en caso de error
      if (this.currentNetwork) {
        this.selectedNetworkId = this.currentNetwork.id;
      }
    }
  }
  
  // Método auxiliar para detectar la red actual
  async detectCurrentNetwork(): Promise<void> {
    try {
      await this.rutasService.detectCurrentNetwork();
    } catch (error) {
      console.error('Error al detectar la red actual:', error);
      this.networkChangeInProgress = false;
    }
  }
  
  // Método para mostrar el estado de la red
  getNetworkStatus(network: NetworkInfo): string {
    if (this.networkChangeInProgress && this.selectedNetworkId === network.id) {
      return 'Cambiando...';
    }
    
    if (this.currentNetwork && network.id === this.currentNetwork.id) {
      return 'Conectado';
    }
    
    return network.isTestnet ? 'Testnet' : 'Mainnet';
  }
  
  // Método para obtener el color del tag de la red
  getNetworkColor(network: NetworkInfo): string {
    if (this.networkChangeInProgress && this.selectedNetworkId === network.id) {
      return 'processing';
    }
    
    if (this.currentNetwork && network.id === this.currentNetwork.id) {
      return 'green';
    }
    
    return network.isTestnet ? 'orange' : 'blue';
  }
}
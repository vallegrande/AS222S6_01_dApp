import { Routes } from '@angular/router';
import { WalletComponent } from './dapp/components/wallet/wallet.component';
import { InirComponentsComponent } from './dapp/components/inir-components/inir-components.component';
import { DashboardComponent } from './dapp/components/dashboard/dashboard.component';
import { ContactComponent } from './dapp/components/contact/contact.component';
import { TransferenciasComponent } from './dapp/components/transferencias/transferencias.component';
import { ConfiguracionComponent } from './dapp/components/configuracion/configuracion.component';
import { LoginComponent } from './dapp/components/login/login.component';
import { WalletGuard } from './dapp/services/WalletGuard';
export const routes: Routes = [
  { 
    path: '', 
    component: InirComponentsComponent,
    canActivate: []  // No hay guard para la página principal
  },
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: []  // No hay guard para el login
  },
  {
    path: 'wallet',
    component: WalletComponent,
    canActivate: [WalletGuard],  // Usar el guard en la ruta principal de wallet
    children: [
      { 
        path: '', 
        redirectTo: 'dashboard', 
        pathMatch: 'full' 
      },
      { 
        path: 'dashboard', 
        component: DashboardComponent
      },
      { 
        path: 'contact', 
        component: ContactComponent 
      },
      { 
        path: 'transferencias', 
        component: TransferenciasComponent 
      },
      { 
        path: 'configuracion', 
        component: ConfiguracionComponent 
      }
    ]
  },
  // Ruta de redirección para cualquier otra URL
  { 
    path: '**', 
    redirectTo: '' 
  }
];
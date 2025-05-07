import { Routes } from '@angular/router';
import { WalletComponent } from './dapp/components/wallet/wallet.component';
import { LoginComponent } from './dapp/components/login/login.component';
import { DashboardComponent } from './dapp/components/dashboard/dashboard.component';
import { ContactComponent } from './dapp/components/contact/contact.component';
import { TransferenciasComponent } from './dapp/components/transferencias/transferencias.component';
import { ConfiguracionComponent } from './dapp/components/configuracion/configuracion.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'wallet',
    component: WalletComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'contact', component: ContactComponent },
      { path: 'transferencias', component: TransferenciasComponent },
      { path: 'configuracion', component: ConfiguracionComponent }
    ]
  }
];
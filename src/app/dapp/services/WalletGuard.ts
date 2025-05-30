import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { WalletService } from '../services/wallet.service';
import { Observable, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WalletGuard implements CanActivate {
  constructor(
    private walletService: WalletService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    // Guardar la ruta a la que se intenta acceder
    localStorage.setItem('lastRoute', state.url);

    // Comprobar si la wallet está conectada
    if (this.walletService.isConnected()) {
      return true;
    }

    // Si no está conectada, intentar conectarla primero
    return new Promise<boolean>((resolve) => {
      this.walletService.connectWallet().then(address => {
        if (address) {
          resolve(true);
        } else {
          // Si falla la conexión, permitir el acceso igualmente
          // pero mostrar una interfaz de "conectar wallet"
          resolve(true);
        }
      }).catch(() => {
        // En caso de error, permitir acceso igualmente
        resolve(true);
      });
    });
  }
}
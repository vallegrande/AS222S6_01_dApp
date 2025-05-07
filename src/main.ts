import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { NzIconService } from 'ng-zorro-antd/icon';
import { inject } from '@angular/core';

// Icono personalizado de Ethereum
const EthereumIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16z" fill="#627EEA"/>
  <path d="M16.498 4v8.87l7.497 3.35z" fill="#fff" fill-opacity=".6"/>
  <path d="M16.498 4L9 16.22l7.498-3.35z" fill="#fff"/>
  <path d="M16.498 21.968v6.027L24 17.616z" fill="#fff" fill-opacity=".6"/>
  <path d="M16.498 27.995v-6.028L9 17.616z" fill="#fff"/>
  <path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fill="#fff" fill-opacity=".2"/>
  <path d="M9 16.22l7.498 4.353v-7.701z" fill="#fff" fill-opacity=".6"/>
</svg>`;

// Configuración adicional para registrar el icono
const iconConfig: ApplicationConfig = {
  providers: [
    {
      provide: 'APP_INITIALIZER',
      useFactory: () => {
        const iconService = inject(NzIconService);
        return () => {
          // Registrar el icono de Ethereum personalizado
          iconService.addIconLiteral('ethereum', EthereumIcon);
        };
      },
      multi: true
    }
  ]
};

// Fusionar la configuración existente con la nueva configuración para iconos
const mergedConfig = mergeApplicationConfig(appConfig, iconConfig);

bootstrapApplication(AppComponent, mergedConfig)
  .catch((err) => console.error(err));
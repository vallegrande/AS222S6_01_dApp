import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

// Importaciones de NG-ZORRO
import { es_ES, NZ_I18N } from 'ng-zorro-antd/i18n';
import { provideNzI18n } from 'ng-zorro-antd/i18n';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzConfig, provideNzConfig } from 'ng-zorro-antd/core/config';

// Configuración de NG-ZORRO
const ngZorroConfig: NzConfig = {
  theme: {
    primaryColor: '#1890ff' // Color primario personalizado
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    provideNzI18n(es_ES),
    provideNzConfig(ngZorroConfig),
    importProvidersFrom(NzIconModule)
  ]
};
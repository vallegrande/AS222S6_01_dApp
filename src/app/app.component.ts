import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TranslateModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Ciskoi-Wallet';

  constructor(
    private translate: TranslateService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Configurar idioma por defecto
    this.translate.setDefaultLang('es');
    
    // Verificar si hay un idioma guardado en localStorage
    const idiomaGuardado = localStorage.getItem('idioma-preferido');
    const idiomaPorDefecto = idiomaGuardado || 'es';
    
    // Usar el idioma y verificar que se carga correctamente
    this.translate.use(idiomaPorDefecto).subscribe({
      next: (translations) => {
        console.log('✅ Traducciones cargadas correctamente:', translations);
      },
      error: (error) => {
        console.error('❌ Error al cargar traducciones:', error);
        console.log('🔍 Verificando ruta del archivo de traducciones...');
        
        // Intentar cargar manualmente para debug
        this.http.get('./app/dapp/i18n/es.json').subscribe({
          next: (data) => console.log('✅ Archivo JSON encontrado:', data),
          error: (err) => {
            console.error('❌ No se pudo cargar el archivo JSON:', err);
            console.log('💡 Verifica que el archivo esté en: src/app/dapp/i18n/es.json');
          }
        });
      }
    });
  }
}
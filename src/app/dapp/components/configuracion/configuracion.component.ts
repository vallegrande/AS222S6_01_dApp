import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css'
})
export class ConfiguracionComponent implements OnInit {
  
  idiomaActual: string = 'es';
  idiomasDisponibles = [
    { codigo: 'es', nombre: 'Español', bandera: '🇪🇸' },
    { codigo: 'en', nombre: 'English', bandera: '🇺🇸' },
    { codigo: 'ja', nombre: '日本語', bandera: '🇯🇵' },
    { codigo: 'ko', nombre: '한국어', bandera: '🇰🇷' },
    { codigo: 'fr', nombre: 'Français', bandera: '🇫🇷' }
  ];

  constructor(
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Cargar idioma guardado si existe
    this.cargarIdiomaGuardado();
    
    // Establecer idioma por defecto
    this.translate.setDefaultLang('es');
    this.translate.use(this.idiomaActual);
    
    // Debug para verificar carga
    console.log('Idioma configurado:', this.idiomaActual);
    this.translate.get('configuracion.titulo').subscribe({
      next: (text) => {
        console.log('✅ Traducción cargada correctamente:', text);
      },
      error: (error) => {
        console.error('❌ Error al cargar traducción:', error);
      }
    });
  }

  cambiarIdioma(idioma: string) {
    console.log('🔄 Cambiando idioma a:', idioma);
    
    this.idiomaActual = idioma;
    
    // Cambiar idioma globalmente - esto dispara onLangChange en otros componentes
    this.translate.use(idioma).subscribe({
      next: (translations) => {
        console.log('✅ Idioma cambiado exitosamente a:', idioma);
        
        // Guardar la preferencia en localStorage
        localStorage.setItem('idioma-preferido', idioma);
        
        // Forzar detección de cambios en este componente
        this.cdr.detectChanges();
        
        // Mostrar mensaje de confirmación (opcional)
        console.log(`🌐 Idioma cambiado a: ${this.obtenerNombreIdiomaActual()}`);
        
        // ALTERNATIVA: Si los cambios no se reflejan inmediatamente, 
        // puedes forzar la recarga (úsalo como último recurso)
        // setTimeout(() => window.location.reload(), 500);
      },
      error: (error) => {
        console.error('❌ Error al cambiar idioma:', error);
        console.log('💡 Verifica que existe el archivo:', `./assets/i18n/${idioma}.json`);
        
        // Revertir el cambio si falla
        this.idiomaActual = this.translate.currentLang || 'es';
      }
    });
  }

  // Método para cargar idioma guardado (si existe)
  private cargarIdiomaGuardado() {
    const idiomaGuardado = localStorage.getItem('idioma-preferido');
    if (idiomaGuardado && this.idiomasDisponibles.some(lang => lang.codigo === idiomaGuardado)) {
      this.idiomaActual = idiomaGuardado;
      console.log('📂 Idioma cargado desde localStorage:', idiomaGuardado);
    } else {
      console.log('🌐 Usando idioma por defecto: es');
    }
  }

  // Método para obtener el nombre del idioma actual
  obtenerNombreIdiomaActual(): string {
    const idioma = this.idiomasDisponibles.find(lang => lang.codigo === this.idiomaActual);
    return idioma ? `${idioma.bandera} ${idioma.nombre}` : 'Español';
  }

  // Método adicional para verificar si un idioma está activo
  esIdiomaActivo(idioma: string): boolean {
    return this.idiomaActual === idioma;
  }
}
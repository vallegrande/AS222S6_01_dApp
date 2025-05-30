import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzModalModule, NzModalService, NzModalRef } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { EventEmitter } from '@angular/core';
import { LoginComponent } from '../login/login.component';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';

@Component({
  selector: 'app-inir-components',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NzModalModule,
    NzButtonModule,
    NzButtonModule,
    NzIconModule,
    NzGridModule,
    NzCardModule,
    NzTypographyModule,
    NzDividerModule,
    NzAvatarModule
  ],
  templateUrl: './inir-components.component.html',
  styleUrls: ['./inir-components.component.css']
})
export class InirComponentsComponent implements OnInit {
  private modalRef: NzModalRef | null = null;
  
  constructor(
    private router: Router,
    private modalService: NzModalService,
    private translate: TranslateService // AGREGAR ESTE SERVICIO
  ) {}

  ngOnInit() {
    // Configurar i18n
    this.initializeTranslations();
  }

  private initializeTranslations() {
    // Cargar idioma guardado o usar español por defecto
    const idiomaGuardado = localStorage.getItem('idioma-preferido') || 'es';
    
    this.translate.setDefaultLang('es');
    this.translate.use(idiomaGuardado);

    // Debug para verificar que las traducciones funcionan
    console.log('Idioma actual:', this.translate.currentLang);
    this.translate.get('navbar.inicio').subscribe(text => {
      console.log('Traducción test:', text);
    });
  }
  
  openLogin() {
    // Si ya hay un modal abierto, no abrimos otro
    if (this.modalRef) {
      return;
    }
    
    this.modalRef = this.modalService.create({
      nzContent: LoginComponent,
      nzFooter: null,
      nzWidth: '420px',
      nzBodyStyle: { padding: '0' },
      nzMaskClosable: false,
      nzClassName: 'wallet-connect-modal'
    });
    
    // Suscribirse al evento de cierre del modal
    this.modalRef.afterClose.subscribe(() => {
      this.modalRef = null;
    });
  }

  teamMembers = [
    {
      name: 'Lizbet Arias',
      role: 'Estudiante de Valle Grande',
      bio: 'Experta en ver animes con más de 2 años de experiencia claro que si!!.',
      image: 'https://i.pinimg.com/736x/84/78/89/847889c1088a7c7b1802f93eac962236.jpg',
      social: {
        github: 'https://github.com/lizbetarias',
        instagram: 'https://instagram.com/lizbetarias'
      }
    },
    {
      name: 'Juan Condori',
      role: 'Docente de Valle Grande',
      bio: 'Apasionada por crear experiencias de usuario intuitivas y accesibles.',
      image: 'https://scontent.flim19-1.fna.fbcdn.net/v/t39.30808-6/428628545_2721617214661138_3314904875312608193_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeF9P4Bir0EDA7EJ1XHxkSdHbCETTGA5E_VsIRNMYDkT9efmMPJUDlI15SR8z1XR5_BSqLTwLaRKSFiRRNsdZ_GP&_nc_ohc=Z3yTHznJwbwQ7kNvwGOr0PJ&_nc_oc=AdlYUwVaNHnQrrhB3QGLHTWpEtNpXOjUlW0OA77qgWklV4BJ8hYHjdk9lpRov9TFvjE&_nc_zt=23&_nc_ht=scontent.flim19-1.fna&_nc_gid=dGCX9umZFQjO1ha__hJI9w&oh=00_AfKx5lur12-dV5jxNz1FKyd-Ctq1cOONJRgaMUPwJGkgOw&oe=683C2247',
      social: {
        github: 'https://github.com/juancondori',
        instagram: 'https://instagram.com/juancondori'
      }
    },
    {
      name: 'Elser Lazaro',
      role: 'Estudiante de Valle Grande',
      bio: 'Apasionada por crear experiencias de usuario intuitivas y accesibles.',
      image: 'https://scontent.flim19-1.fna.fbcdn.net/v/t1.6435-9/197216700_3753378988100952_7481183708118712528_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeHMUi2VtNtg1JhVin_RSI5xHz41M6HysTkfPjUzofKxOdG_11luSdm-f_hdJ9KNpYeY1QY8WMzFZ7LNqbf3mmEH&_nc_ohc=Q3Xh_BCVQqMQ7kNvwEAQzdW&_nc_oc=Adm1vF_jfq9W1QVSf8Sof1NNCXXt-NjDlwoP83Sdmj7E_zJseKbhd3mY6MKNpRMIaiw&_nc_zt=23&_nc_ht=scontent.flim19-1.fna&_nc_gid=xC1ZS8tD96vlUzDUY5-rmQ&oh=00_AfKmOZDq0YTEyY5FpJT1JR8RzWZVhp1fTmHKtBtIBD6fJg&oe=6852220E',
      social: {
        github: 'https://github.com/elserlazaro',
        instagram: 'https://instagram.com/elserlazaro'
      }
    }
  ];

  features = [
    {
      icon: 'safety',
      title: 'Seguridad Avanzada',
      description: 'Protección de última generación para tus activos digitales.'
    },
    {
      icon: 'thunderbolt',
      title: 'Transacciones Instantáneas',
      description: 'Envía y recibe cripto en segundos.'
    },
    {
      icon: 'interaction',
      title: 'Multi-Chain',
      description: 'Soporte para múltiples blockchains.'
    },
    {
      icon: 'dollar',
      title: 'Gestión de Gastos',
      description: 'Seguimiento detallado de tus transacciones.'
    }
  ];
}
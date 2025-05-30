import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzColorPickerModule } from 'ng-zorro-antd/color-picker';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { Clipboard } from '@angular/cdk/clipboard';

import { ContactData } from '../../interfaces/wallet.interface';

import { TranslateModule, TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzGridModule,
    NzIconModule,
    NzColorPickerModule,
    NzTableModule,
    NzDividerModule,
    NzToolTipModule,
    NzEmptyModule,
    NzPopconfirmModule,
    NzModalModule
  ],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css']
})
export class ContactComponent implements OnInit {
  contactForm: Partial<ContactData> = {
    walletAddress: '',
    name: '',
    description: '',
    color: '#1890ff'
  };

  contacts: ContactData[] = [];
  isEditing: boolean = false;
  currentEditIndex: number | null = null;
  searchValue: string = '';
  loadingContacts: boolean = true;

  constructor(
    private message: NzMessageService,
    private clipboard: Clipboard,
    private translate: TranslateService // AGREGAR ESTE SERVICIO

  ) { }

  ngOnInit(): void {
    this.loadContacts();
  }

  // Cargar contactos desde localStorage
  private loadContacts(): void {
    this.loadingContacts = true;
    try {
      const savedContacts = localStorage.getItem('wallet-contacts');
      if (savedContacts) {
        this.contacts = JSON.parse(savedContacts);
      }
    } catch (error) {
      this.message.error('Error al cargar los contactos guardados');
      console.error('Error loading contacts:', error);
    } finally {
      setTimeout(() => {
        this.loadingContacts = false;
      }, 500); // Pequeño delay para mejorar UX
    }
  }

  // Guardar contactos en localStorage
  private saveContacts(): void {
    try {
      localStorage.setItem('wallet-contacts', JSON.stringify(this.contacts));
    } catch (error) {
      this.message.error('Error al guardar los contactos');
      console.error('Error saving contacts:', error);
    }
  }

  // Validar dirección Ethereum
  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Agregar o actualizar contacto
  addContact(): void {
    if (!this.contactForm.walletAddress || !this.contactForm.name) {
      this.message.error('La dirección de wallet y el nombre son obligatorios');
      return;
    }

    if (!this.isValidEthereumAddress(this.contactForm.walletAddress)) {
      this.message.error('La dirección de wallet no es válida (formato 0x...)');
      return;
    }

    const timestamp = Date.now();

    if (this.isEditing && this.currentEditIndex !== null) {
      // Actualizar contacto existente
      const updatedContact = {
        ...this.contacts[this.currentEditIndex],
        ...this.contactForm,
        updatedAt: timestamp
      };

      this.contacts[this.currentEditIndex] = updatedContact;
      this.message.success(`Contacto "${updatedContact.name}" actualizado correctamente`);
      this.isEditing = false;
      this.currentEditIndex = null;
    } else {
      // Verificar si ya existe un contacto con la misma dirección
      const existingContact = this.contacts.find(
        c => c.walletAddress.toLowerCase() === this.contactForm.walletAddress?.toLowerCase()
      );

      if (existingContact) {
        this.message.warning(`Ya existe un contacto con esta dirección: ${existingContact.name}`);
        return;
      }

      // Añadir nuevo contacto
      const newContact: ContactData = {
        ...this.contactForm as ContactData,
        id: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      this.contacts = [...this.contacts, newContact];
      this.message.success(`Contacto "${newContact.name}" añadido correctamente`);
    }

    // Guardar y limpiar formulario
    this.saveContacts();
    this.resetForm();
  }

  // Editar contacto
  editContact(index: number): void {
    if (index >= 0 && index < this.contacts.length) {
      this.isEditing = true;
      this.currentEditIndex = index;
      this.contactForm = { ...this.contacts[index] };
    }
  }

  // Eliminar contacto
  deleteContact(index: number): void {
    if (index >= 0 && index < this.contacts.length) {
      const contactName = this.contacts[index].name;
      this.contacts = this.contacts.filter((_, i) => i !== index);
      this.saveContacts();
      this.message.success(`Contacto "${contactName}" eliminado correctamente`);

      // Si estamos editando el contacto que acabamos de eliminar, cancelamos la edición
      if (this.isEditing && this.currentEditIndex === index) {
        this.resetForm();
      }
    }
  }

  // Cancelar edición
  cancelEdit(): void {
    this.resetForm();
  }

  // Resetear formulario
  resetForm(): void {
    this.isEditing = false;
    this.currentEditIndex = null;
    this.contactForm = {
      walletAddress: '',
      name: '',
      description: '',
      color: '#1890ff'
    };
  }

  // Copiar dirección al portapapeles
  copyToClipboard(text: string): void {
    this.clipboard.copy(text);
    this.message.success('Dirección copiada al portapapeles');
  }

  // Getter para contactos filtrados
  get filteredContacts(): ContactData[] {
    if (!this.searchValue) {
      return this.contacts;
    }

    const searchTerm = this.searchValue.toLowerCase().trim();
    return this.contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm) ||
      contact.walletAddress.toLowerCase().includes(searchTerm) ||
      (contact.description && contact.description.toLowerCase().includes(searchTerm))
    );
  }

  // Exportar contactos
  exportContacts(): void {
    if (this.contacts.length === 0) {
      this.message.warning('No hay contactos para exportar');
      return;
    }

    try {
      const dataStr = JSON.stringify(this.contacts, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `mis-contactos-${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      this.message.success('Contactos exportados correctamente');
    } catch (error) {
      this.message.error('Error al exportar los contactos');
      console.error('Error exporting contacts:', error);
    }
  }

  // Importar contactos (método opcional para futuras mejoras)
  importContacts(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedContacts = JSON.parse(e.target?.result as string);
          if (Array.isArray(importedContacts)) {
            this.contacts = [...this.contacts, ...importedContacts];
            this.saveContacts();
            this.message.success(`${importedContacts.length} contactos importados correctamente`);
          } else {
            this.message.error('Formato de archivo inválido');
          }
        } catch (error) {
          this.message.error('Error al leer el archivo');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    }
  }
}
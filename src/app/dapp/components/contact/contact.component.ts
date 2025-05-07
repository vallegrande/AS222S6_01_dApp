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

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
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
    private clipboard: Clipboard
  ) {}
  
  ngOnInit(): void {
    this.loadContactsFromLocalStorage();
  }
  
  // Guardar contactos en localStorage
  private saveContactsToLocalStorage(): void {
    localStorage.setItem('wallet-contacts', JSON.stringify(this.contacts));
  }
  
  // Cargar contactos desde localStorage
  private loadContactsFromLocalStorage(): void {
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
      this.loadingContacts = false;
    }
  }
  
  isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
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
    
    // Guardar en localStorage y limpiar formulario
    this.saveContactsToLocalStorage();
    this.resetForm();
  }
  
  editContact(index: number): void {
    this.isEditing = true;
    this.currentEditIndex = index;
    this.contactForm = {...this.contacts[index]};
  }
  
  deleteContact(index: number): void {
    const contactName = this.contacts[index].name;
    this.contacts = this.contacts.filter((_, i) => i !== index);
    this.saveContactsToLocalStorage();
    this.message.success(`Contacto "${contactName}" eliminado correctamente`);
    
    // Si estamos editando el contacto que acabamos de eliminar, cancelamos la edición
    if (this.isEditing && this.currentEditIndex === index) {
      this.resetForm();
    }
  }
  
  cancelEdit(): void {
    this.resetForm();
  }
  
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
  
  copyToClipboard(text: string): void {
    this.clipboard.copy(text);
    this.message.success('Dirección copiada al portapapeles');
  }
  
  // Filtrar contactos según término de búsqueda
  get filteredContacts(): ContactData[] {
    if (!this.searchValue) {
      return this.contacts;
    }
    
    const searchTerm = this.searchValue.toLowerCase();
    return this.contacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm) || 
      contact.walletAddress.toLowerCase().includes(searchTerm) ||
      (contact.description && contact.description.toLowerCase().includes(searchTerm))
    );
  }

  // Exportar contactos
  exportContacts(): void {
    try {
      const dataStr = JSON.stringify(this.contacts, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
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
}
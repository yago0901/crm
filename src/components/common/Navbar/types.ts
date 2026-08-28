import type { ComponentType } from 'react';

export interface NavbarMenuChild {
  label: string;
  path: string;
}

export interface NavbarMenuItem {
  key: string;
  label: string;
  icon: ComponentType;
  path?: string;
  children?: NavbarMenuChild[];
}

export interface INavbar {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  menu?: NavbarMenuItem[];
  logoutRedirectTo?: string;
}

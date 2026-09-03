import type { ComponentType } from 'react';
import type { ModuleKey } from '../../../services/shared/modules';

export interface NavbarMenuChild {
  label: string;
  path: string;
  adminOnly?: boolean;
}

export interface NavbarMenuItem {
  key: string;
  label: string;
  icon: ComponentType;
  path?: string;
  children?: NavbarMenuChild[];
  requiredModule?: ModuleKey;
}

export interface INavbar {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  menu?: NavbarMenuItem[];
  logoutRedirectTo?: string;
}

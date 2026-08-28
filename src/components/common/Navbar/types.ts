import type { ComponentType } from 'react';
import type { ModuleKey } from '../../../services/shared/modules';

export interface NavbarMenuChild {
  label: string;
  path: string;
  // When set, the item only shows for a user whose isAdmin flag (Admin or
  // Manager, today) matches. Omit for items every level can see.
  adminOnly?: boolean;
}

export interface NavbarMenuItem {
  key: string;
  label: string;
  icon: ComponentType;
  path?: string;
  children?: NavbarMenuChild[];
  // When set, the whole section only shows for a user who has this module
  // granted (modules[]) or is Admin/Manager. Omit for sections everyone
  // sees (e.g. Home).
  requiredModule?: ModuleKey;
}

export interface INavbar {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  menu?: NavbarMenuItem[];
  logoutRedirectTo?: string;
}

import type { ComponentType } from 'react';

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
}

export interface INavbar {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  menu?: NavbarMenuItem[];
  logoutRedirectTo?: string;
}

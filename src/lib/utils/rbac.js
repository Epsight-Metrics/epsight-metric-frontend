// RBAC utility — Role-Based Access Control
import { toFrontendRole } from './roles.js';

const ROLE_ROUTES = {
  operator: ['/operator'],
  admin: ['/admin'],
  manager: ['/manager'],
  auditor: ['/auditor'],
  engineer: ['/engineer'],
};

const ROLE_DASHBOARDS = {
  operator: '/operator',
  admin: '/admin',
  manager: '/manager',
  auditor: '/auditor',
  engineer: '/engineer',
};

export function canAccess(role, path) {
  if (!role) return false;
  const shared = ['/profile'];
  if (shared.some(r => path.startsWith(r))) return true;
  return (ROLE_ROUTES[role] || []).some(p => path.startsWith(p));
}

export function getDashboardUrl(role) {
  return ROLE_DASHBOARDS[role] || '/login';
}

export function getAllRoles() {
  return [
    { value: 'operator', label: 'Operator QC' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'QC Manager' },
    { value: 'auditor', label: 'Auditor' },
    { value: 'engineer', label: 'Engineer' },
  ];
}

// Role mapping between backend enums and frontend shorthand
const BACKEND_TO_FRONTEND = {
  OPERATOR_QC: 'operator',
  QUALITY_MANAGER: 'manager',
  AUDIT: 'auditor',
  ADMIN: 'admin',
  ENGINEER: 'engineer',
};

const FRONTEND_TO_BACKEND = {
  operator: 'OPERATOR_QC',
  manager: 'QUALITY_MANAGER',
  auditor: 'AUDIT',
  admin: 'ADMIN',
  engineer: 'ENGINEER',
};

/**
 * Convert a backend role enum to the frontend shorthand.
 * @param {string} backendRole - e.g. 'OPERATOR_QC'
 * @returns {string} - e.g. 'operator'
 */
export function toFrontendRole(backendRole) {
  return BACKEND_TO_FRONTEND[backendRole] || 'operator';
}

/**
 * Convert a frontend shorthand role to the backend enum.
 * @param {string} frontendRole - e.g. 'operator'
 * @returns {string} - e.g. 'OPERATOR_QC'
 */
export function toBackendRole(frontendRole) {
  return FRONTEND_TO_BACKEND[frontendRole] || 'OPERATOR_QC';
}

/**
 * Get all roles as select options with backend values.
 */
export function getAllBackendRoles() {
  return [
    { value: 'OPERATOR_QC', label: 'Operator QC' },
    { value: 'QUALITY_MANAGER', label: 'QC Manager' },
    { value: 'AUDIT', label: 'Auditor' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'ENGINEER', label: 'Engineer' },
  ];
}

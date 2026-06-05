import { ForbiddenException } from '@nestjs/common';

export function isDirectorRole(role: unknown): boolean {
  return typeof role === 'string' && role.toLowerCase() === 'director';
}

export function isPatientRole(role: unknown): boolean {
  return typeof role === 'string' && role.toLowerCase() === 'patient';
}

export function assertNotDirectorMutation(role: unknown, message?: string): void {
  if (isDirectorRole(role)) {
    throw new ForbiddenException(
      message ?? 'Directors have read-only access for this action',
    );
  }
}


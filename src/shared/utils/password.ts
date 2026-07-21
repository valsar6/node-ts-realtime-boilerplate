import bcrypt from 'bcryptjs';
import { CONSTANTS } from '../../config/constants';

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, CONSTANTS.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

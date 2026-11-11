export const HARDCODED_PIN = '7977303911';

export const DEFAULT_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@jalkhoj.app',
  display_name: 'Jal Khoj Admin',
};

export async function getActiveUser() {
  return DEFAULT_USER;
}

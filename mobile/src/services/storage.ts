import {MMKV} from 'react-native-mmkv';

export const storage = new MMKV({id: 'blockme-storage'});

export const StorageKeys = {
  SERVER_URL: 'server_url',
  TOKEN: 'token',
  ONBOARDED: 'onboarded',
  DEVICE_ID: 'device_id',
  WG_PRIVATE_KEY: 'wg_private_key',
  WG_CONFIG: 'wg_config',
} as const;

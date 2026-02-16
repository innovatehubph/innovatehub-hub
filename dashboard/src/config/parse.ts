import Parse from 'parse';

Parse.initialize(
  'lOpBh4pgpWdiYJmAU4aXSNyYYY8d86hxH2hilkWN',
  '4LJLYoC5inPb7m8zkNs6KmwnqlnvQ2eXa2Z5LMhm'
);
Parse.masterKey = 't78J6V3bHE18i0ZfTIqVIyLUxlLYdU0L1GZYJd4h';
(Parse as any).serverURL = 'https://parseapi.back4app.com';

export default Parse;

export const BUSINESSES = {
  platapay: { id: 'GTHxktOij6', name: 'PlataPay', slug: 'platapay' },
  innovatehub: { id: 'g3EFKft6Wj', name: 'InnovateHub', slug: 'innovatehub' },
} as const;

export const WEBHOOK_URL = 'https://parseapi.back4app.com/facebook/webhook';
export const VERIFY_TOKEN = 'innovatehub_verify_2024';

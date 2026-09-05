import type { RootContent, Locale } from './types';
import { en } from './en';
import { pt } from './pt';
import { es } from './es';

export const content: Record<Locale, RootContent> = { en, pt, es };
export const locales: Locale[] = ['en', 'pt', 'es'];
export const localeNames: Record<Locale, string> = { en: 'EN', pt: 'PT', es: 'ES' };
export const prefix = (l: Locale) => (l === 'en' ? '' : `/${l}`);
export type { RootContent, Person, Locale } from './types';

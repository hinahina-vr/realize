import { ja, type Language, type Translations } from './ja'
import { en } from './en'
import { zh } from './zh'
import { ko } from './ko'

export type { Language, Translations }

export const translations: Record<Language, Translations> = {
    ja,
    en,
    zh,
    ko
}

export const languageFlags: Record<Language, string> = {
    ja: '日本',
    en: 'EN',
    zh: '中文',
    ko: '한국'
}

export const languageNames: Record<Language, string> = {
    ja: '日本語',
    en: 'English',
    zh: '简体中文',
    ko: '한국어'
}

export function getTranslation(language: Language): Translations {
    return translations[language]
}

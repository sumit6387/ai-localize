// Main exports
export { LocalizationService } from './services/localizationService';
export { CacheService } from './services/cacheService';
export { TranslationService } from './services/translationService';
export { TextExtractor } from './utils/textExtractor';

// Type exports
export type {
  LocalizationConfig,
  TranslationRequest,
  TranslationResponse,
  DocumentTranslationOptions,
  CachedTranslation,
  LocalizationServiceOptions,
} from './types';

// Default export
export { LocalizationService as default } from './services/localizationService';

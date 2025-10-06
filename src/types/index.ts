export interface LocalizationConfig {
  redisUrl: string;
  aiApiKey: string;
  aiProvider: 'openai' | 'google' | 'azure' | 'gemini';
  sourceLanguage?: string;
  cacheExpiration?: number; // in seconds, default 24 hours
  batchSize?: number; // for batch translations
}

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
}

export interface DocumentTranslationOptions {
  fields?: string[]; // specific fields to translate
  excludeFields?: string[]; // fields to exclude from translation
  preserveStructure?: boolean; // maintain original document structure
  batchSize?: number;
}

export interface CachedTranslation {
  translatedText: string;
  timestamp: number;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface LocalizationServiceOptions {
  config: LocalizationConfig;
}

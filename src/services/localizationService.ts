import { CacheService } from './cacheService';
import { TranslationService } from './translationService';
import { TextExtractor } from '../utils/textExtractor';
import {
  LocalizationConfig,
  LocalizationServiceOptions,
  DocumentTranslationOptions,
  TranslationRequest,
  TranslationResponse,
} from '../types';

export class LocalizationService {
  private cacheService: CacheService;
  private translationService: TranslationService;
  private config: LocalizationConfig;

  constructor(options: LocalizationServiceOptions) {
    this.config = {
      sourceLanguage: 'en',
      cacheExpiration: 86400, // 24 hours
      batchSize: 10,
      ...options.config,
    };

    this.cacheService = new CacheService(this.config.redisUrl);
    this.translationService = new TranslationService(this.config);
  }

  /**
   * Initialize the service (connect to Redis)
   */
  async initialize(): Promise<void> {
    await this.cacheService.connect();
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.cacheService.disconnect();
  }

  /**
   * Translate a single text
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<TranslationResponse> {
    const sourceLang = sourceLanguage || this.config.sourceLanguage || 'en';

    // Check cache first
    const cachedTranslation = await this.cacheService.getCachedTranslation(
      text,
      sourceLang,
      targetLanguage
    );

    if (cachedTranslation) {
      return {
        translatedText: cachedTranslation,
        sourceLanguage: sourceLang,
        targetLanguage,
        cached: true,
      };
    }

    // Translate using AI service
    const translation = await this.translationService.translateText({
      text,
      targetLanguage,
      sourceLanguage: sourceLang,
    });

    // Cache the result
    await this.cacheService.cacheTranslation(
      text,
      translation.translatedText,
      sourceLang,
      targetLanguage,
      this.config.cacheExpiration
    );

    return translation;
  }

  /**
   * Translate a MongoDB document
   */
  async translateDocument(
    document: any,
    targetLanguage: string,
    options: DocumentTranslationOptions = {}
  ): Promise<any> {
    const sourceLanguage = this.config.sourceLanguage || 'en';

    // Extract texts to translate
    const texts = TextExtractor.extractTextFromDocument(document, {
      fields: options.fields,
      excludeFields: options.excludeFields,
    }).filter(text => TextExtractor.shouldTranslate(text));

    if (texts.length === 0) {
      return document;
    }

    // Get cached translations
    const cachedTranslations = await this.cacheService.getBatchCachedTranslations(
      texts,
      sourceLanguage,
      targetLanguage
    );

    // Find texts that need translation
    const textsToTranslate = texts.filter(text => !cachedTranslations.has(text));

    // Translate remaining texts
    let newTranslations = new Map<string, string>();
    if (textsToTranslate.length > 0) {
      newTranslations = await this.translationService.translateBatch(
        textsToTranslate,
        targetLanguage,
        sourceLanguage
      );

      // Cache new translations
      await this.cacheService.cacheBatchTranslations(
        newTranslations,
        sourceLanguage,
        targetLanguage,
        this.config.cacheExpiration
      );
    }

    // Combine all translations
    const allTranslations = new Map([
      ...cachedTranslations,
      ...newTranslations,
    ]);

    // Reconstruct document with translations
    return TextExtractor.reconstructDocumentWithTranslations(
      document,
      allTranslations,
      {
        fields: options.fields,
        excludeFields: options.excludeFields,
      }
    );
  }

  /**
   * Translate multiple documents
   */
  async translateDocuments(
    documents: any[],
    targetLanguage: string,
    options: DocumentTranslationOptions = {}
  ): Promise<any[]> {
    const results: any[] = [];

    for (const document of documents) {
      const translatedDoc = await this.translateDocument(
        document,
        targetLanguage,
        options
      );
      results.push(translatedDoc);
    }

    return results;
  }


  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    connected: boolean;
  }> {
    return this.cacheService.getCacheStats();
  }

  /**
   * Clear cache for specific language pair
   */
  async clearCache(
    sourceLanguage?: string,
    targetLanguage?: string
  ): Promise<void> {
    const sourceLang = sourceLanguage || this.config.sourceLanguage || 'en';
    
    if (targetLanguage) {
      await this.cacheService.clearCacheForLanguagePair(sourceLang, targetLanguage);
    } else {
      // Clear all cache (implement if needed)
      console.warn('Clearing all cache not implemented. Please specify target language.');
    }
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<string> {
    return this.translationService.detectLanguage(text);
  }

  /**
   * Translate with custom field mapping
   */
  async translateWithFieldMapping(
    document: any,
    targetLanguage: string,
    fieldMapping: Record<string, string>, // originalField -> translatedField
    options: DocumentTranslationOptions = {}
  ): Promise<any> {
    const translatedDocument = await this.translateDocument(
      document,
      targetLanguage,
      options
    );

    // Apply field mapping
    const result = { ...translatedDocument };
    
    Object.entries(fieldMapping).forEach(([originalField, translatedField]) => {
      if (result[originalField]) {
        result[translatedField] = result[originalField];
        delete result[originalField];
      }
    });

    return result;
  }

  /**
   * Translate nested objects/arrays
   */
  async translateNestedDocument(
    document: any,
    targetLanguage: string,
    nestedFields: string[], // fields that contain nested documents
    options: DocumentTranslationOptions = {}
  ): Promise<any> {
    const result = { ...document };

    for (const field of nestedFields) {
      if (result[field]) {
        if (Array.isArray(result[field])) {
          result[field] = await this.translateDocuments(
            result[field],
            targetLanguage,
            options
          );
        } else if (typeof result[field] === 'object') {
          result[field] = await this.translateDocument(
            result[field],
            targetLanguage,
            options
          );
        }
      }
    }

    return result;
  }

  /**
   * Batch translate with progress callback
   */
  async translateWithProgress(
    documents: any[],
    targetLanguage: string,
    options: DocumentTranslationOptions & {
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<any[]> {
    const { onProgress, ...translationOptions } = options;
    const results: any[] = [];
    const total = documents.length;

    for (let i = 0; i < documents.length; i++) {
      const translatedDoc = await this.translateDocument(
        documents[i],
        targetLanguage,
        translationOptions
      );
      results.push(translatedDoc);

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    return results;
  }
}

import { createClient, RedisClientType } from 'redis';
import { CachedTranslation } from '../types';

export class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor(private redisUrl: string) {
    this.client = createClient({
      url: redisUrl,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Disconnected from Redis');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  /**
   * Generate cache key for translation
   */
  private generateCacheKey(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): string {
    const normalizedText = text.toLowerCase().trim();
    return `translation:${sourceLanguage}:${targetLanguage}:${Buffer.from(normalizedText).toString('base64')}`;
  }

  /**
   * Get cached translation
   */
  async getCachedTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string | null> {
    try {
      await this.connect();
      const cacheKey = this.generateCacheKey(text, sourceLanguage, targetLanguage);
      const cached = await this.client.get(cacheKey);
      
      if (cached) {
        const parsed: CachedTranslation = JSON.parse(cached);
        return parsed.translatedText;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cached translation:', error);
      return null;
    }
  }

  /**
   * Cache translation result
   */
  async cacheTranslation(
    text: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    expirationSeconds: number = 86400 // 24 hours default
  ): Promise<void> {
    try {
      await this.connect();
      const cacheKey = this.generateCacheKey(text, sourceLanguage, targetLanguage);
      
      const cachedData: CachedTranslation = {
        translatedText,
        timestamp: Date.now(),
        sourceLanguage,
        targetLanguage,
      };

      await this.client.setEx(
        cacheKey,
        expirationSeconds,
        JSON.stringify(cachedData)
      );
    } catch (error) {
      console.error('Error caching translation:', error);
    }
  }

  /**
   * Get multiple cached translations
   */
  async getBatchCachedTranslations(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    try {
      await this.connect();
      
      const pipeline = this.client.multi();
      const cacheKeys: string[] = [];
      
      texts.forEach(text => {
        const cacheKey = this.generateCacheKey(text, sourceLanguage, targetLanguage);
        cacheKeys.push(cacheKey);
        pipeline.get(cacheKey);
      });

      const responses = await pipeline.exec();
      
      if (responses) {
        responses.forEach((response, index) => {
          if (response && typeof response === 'string') {
            try {
              const parsed: CachedTranslation = JSON.parse(response);
              results.set(texts[index], parsed.translatedText);
            } catch (parseError) {
              console.error('Error parsing cached translation:', parseError);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error getting batch cached translations:', error);
    }
    
    return results;
  }

  /**
   * Cache multiple translations
   */
  async cacheBatchTranslations(
    translations: Map<string, string>,
    sourceLanguage: string,
    targetLanguage: string,
    expirationSeconds: number = 86400
  ): Promise<void> {
    try {
      await this.connect();
      
      const pipeline = this.client.multi();
      
      translations.forEach((translatedText, text) => {
        const cacheKey = this.generateCacheKey(text, sourceLanguage, targetLanguage);
        const cachedData: CachedTranslation = {
          translatedText,
          timestamp: Date.now(),
          sourceLanguage,
          targetLanguage,
        };
        
        pipeline.setEx(
          cacheKey,
          expirationSeconds,
          JSON.stringify(cachedData)
        );
      });

      await pipeline.exec();
    } catch (error) {
      console.error('Error caching batch translations:', error);
    }
  }

  /**
   * Clear cache for specific language pair
   */
  async clearCacheForLanguagePair(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<void> {
    try {
      await this.connect();
      const pattern = `translation:${sourceLanguage}:${targetLanguage}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    connected: boolean;
  }> {
    try {
      await this.connect();
      const info = await this.client.info('memory');
      const totalKeys = await this.client.dbSize();
      
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';
      
      return {
        totalKeys,
        memoryUsage,
        connected: this.isConnected,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
        connected: false,
      };
    }
  }
}

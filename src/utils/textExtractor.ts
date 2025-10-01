import { Document } from 'mongoose';

export class TextExtractor {
  /**
   * Extract all text content from a MongoDB document
   */
  static extractTextFromDocument(doc: any, options: {
    fields?: string[];
    excludeFields?: string[];
  } = {}): string[] {
    const texts: string[] = [];
    const { fields, excludeFields } = options;

    const extractFromObject = (obj: any, path: string = ''): void => {
      if (obj === null || obj === undefined) return;
      
      if (typeof obj === 'string') {
        // Only extract if it's not empty and not a MongoDB ObjectId
        if (obj.trim() && !obj.match(/^[0-9a-fA-F]{24}$/)) {
          texts.push(obj.trim());
        }
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          extractFromObject(item, `${path}[${index}]`);
        });
        return;
      }

      if (typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          const currentPath = path ? `${path}.${key}` : key;
          
          // Skip excluded fields
          if (excludeFields && excludeFields.includes(currentPath)) {
            return;
          }
          
          // If specific fields are specified, only process those
          if (fields && !fields.some(field => currentPath.startsWith(field))) {
            return;
          }
          
          // Skip MongoDB internal fields
          if (key.startsWith('_') || key === '__v') {
            return;
          }
          
          extractFromObject(obj[key], currentPath);
        });
      }
    };

    extractFromObject(doc);
    return texts;
  }

  /**
   * Reconstruct document with translated texts
   */
  static reconstructDocumentWithTranslations(
    originalDoc: any,
    translations: Map<string, string>,
    options: {
      fields?: string[];
      excludeFields?: string[];
    } = {}
  ): any {
    const { fields, excludeFields } = options;
    
    const reconstruct = (obj: any, path: string = ''): any => {
      if (obj === null || obj === undefined) return obj;
      
      if (typeof obj === 'string') {
        // Look for translation using the original text as key
        return translations.get(obj) || obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          reconstruct(item, `${path}[${index}]`)
        );
      }

      if (typeof obj === 'object') {
        const result: any = {};
        Object.keys(obj).forEach(key => {
          const currentPath = path ? `${path}.${key}` : key;
          
          // Skip excluded fields
          if (excludeFields && excludeFields.includes(currentPath)) {
            result[key] = obj[key];
            return;
          }
          
          // If specific fields are specified, only translate those
          if (fields && !fields.some(field => currentPath.startsWith(field))) {
            result[key] = obj[key];
            return;
          }
          
          // Skip MongoDB internal fields
          if (key.startsWith('_') || key === '__v') {
            result[key] = obj[key];
            return;
          }
          
          result[key] = reconstruct(obj[key], currentPath);
        });
        return result;
      }

      return obj;
    };

    return reconstruct(originalDoc);
  }

  /**
   * Generate cache key for translation
   */
  static generateCacheKey(text: string, path: string = ''): string {
    return `${path}:${text}`.toLowerCase().trim();
  }

  /**
   * Check if text should be translated (not empty, not ObjectId, etc.)
   */
  static shouldTranslate(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    
    // Skip empty strings
    if (!text.trim()) return false;
    
    // Skip MongoDB ObjectIds
    if (text.match(/^[0-9a-fA-F]{24}$/)) return false;
    
    // Skip URLs
    if (text.match(/^https?:\/\//)) return false;
    
    // Skip email addresses
    if (text.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return false;
    
    // Skip phone numbers
    if (text.match(/^[\+]?[1-9][\d]{0,15}$/)) return false;
    
    return true;
  }
}

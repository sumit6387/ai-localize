# Mongoose Localization Service

A powerful Node.js package for translating MongoDB documents from English (or any source language) to any target language using AI services like OpenAI, Google Translate, or Azure Translator. Features intelligent Redis caching to reduce API costs and improve performance.

## 🌟 Features

- 🤖 **AI-Powered Translation**: Support for OpenAI GPT, Google Translate, and Azure Translator
- ⚡ **Redis Caching**: Intelligent caching to reduce API calls and costs
- 📄 **Document Translation**: Translate entire MongoDB documents or specific fields
- 🔄 **Batch Processing**: Efficient batch translation with progress tracking
- 🎯 **Field Selection**: Choose which fields to translate or exclude
- 🏗️ **Mongoose Integration**: Seamless integration with Mongoose models
- 📊 **Cache Management**: Built-in cache statistics and management
- 🔧 **TypeScript Support**: Full TypeScript definitions included
- 🌍 **Multi-language Support**: Translate to any language supported by AI providers

## 📦 Installation

```bash
npm install mongoose-localization-service
```

## 🚀 Quick Start

```typescript
import { LocalizationService } from 'mongoose-localization-service';

// Configuration
const config = {
  redisUrl: 'redis://localhost:6379',    // Your Redis URL
  aiApiKey: 'your-openai-api-key',        // Your AI API key
  aiProvider: 'openai',                   // 'openai', 'google', or 'azure'
  sourceLanguage: 'en',                   // Source language (default: 'en')
  cacheExpiration: 86400,                 // Cache expiration in seconds (24 hours)
  batchSize: 10,                          // Batch size for translations
};

// Create service instance
const localizationService = new LocalizationService({ config });

// Initialize (connects to Redis)
await localizationService.initialize();

// Example document
const product = {
  name: 'Wireless Headphones',
  description: 'High-quality wireless headphones with noise cancellation.',
  category: 'Electronics',
  price: 199.99,
  tags: ['wireless', 'bluetooth', 'premium'],
};

// Translate to Spanish
const translatedProduct = await localizationService.translateDocument(
  product,
  'es'
);

console.log(translatedProduct);
// Output: { name: 'Auriculares Inalámbricos', description: 'Auriculares inalámbricos de alta calidad con cancelación de ruido.', ... }

// Close connections
await localizationService.close();
```

## ⚙️ Configuration

### Required Configuration

```typescript
interface LocalizationConfig {
  redisUrl: string;           // Redis connection URL
  aiApiKey: string;          // AI service API key
  aiProvider: 'openai' | 'google' | 'azure'; // AI provider
}
```

### Optional Configuration

```typescript
interface LocalizationConfig {
  sourceLanguage?: string;    // Source language (default: 'en')
  cacheExpiration?: number;   // Cache expiration in seconds (default: 86400)
  batchSize?: number;         // Batch size for translations (default: 10)
}
```

## 🔑 AI Provider Setup

### OpenAI (Recommended)
```typescript
const config = {
  redisUrl: 'redis://localhost:6379',
  aiApiKey: 'sk-your-openai-api-key',
  aiProvider: 'openai',
};
```

**Get API Key**: Visit [OpenAI API](https://platform.openai.com/api-keys) to get your API key.

### Google Translate
```typescript
const config = {
  redisUrl: 'redis://localhost:6379',
  aiApiKey: 'your-google-translate-api-key',
  aiProvider: 'google',
};
```

**Get API Key**: Visit [Google Cloud Console](https://console.cloud.google.com/) and enable the Translate API.

### Azure Translator
```typescript
const config = {
  redisUrl: 'redis://localhost:6379',
  aiApiKey: 'your-azure-translator-api-key',
  aiProvider: 'azure',
};
```

**Get API Key**: Visit [Azure Portal](https://portal.azure.com/) and create a Translator resource.

## 📚 API Reference

### LocalizationService

#### Constructor
```typescript
new LocalizationService(options: LocalizationServiceOptions)
```

**Parameters:**
- `options.config`: LocalizationConfig object with required settings

#### Methods

##### `initialize(): Promise<void>`
Initialize the service and connect to Redis.

```typescript
await localizationService.initialize();
```

##### `close(): Promise<void>`
Close Redis connection.

```typescript
await localizationService.close();
```

##### `translateDocument(document, targetLanguage, options?): Promise<any>`
Translates a MongoDB document to the target language.

**Parameters:**
- `document`: MongoDB document object to translate
- `targetLanguage`: Target language code (e.g., 'es', 'fr', 'de', 'hi', 'ja', 'ru')
- `options`: Optional DocumentTranslationOptions

**Options:**
```typescript
interface DocumentTranslationOptions {
  fields?: string[];           // Only translate these fields
  excludeFields?: string[];     // Exclude these fields from translation
  preserveStructure?: boolean;  // Maintain document structure (default: true)
  batchSize?: number;          // Override default batch size
}
```

**Example:**
```typescript
const translatedDoc = await localizationService.translateDocument(
  document,
  'es', // Spanish
  {
    fields: ['name', 'description'], // Only translate these fields
    excludeFields: ['_id', 'price'], // Exclude these fields
  }
);
```

##### `translateText(text, targetLanguage, sourceLanguage?): Promise<TranslationResponse>`
Translates a single text string.

**Parameters:**
- `text`: Text string to translate
- `targetLanguage`: Target language code
- `sourceLanguage`: Source language code (optional, uses config default)

**Returns:**
```typescript
interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  cached: boolean;
}
```

**Example:**
```typescript
const result = await localizationService.translateText(
  'Hello, world!',
  'es'
);

console.log(result.translatedText); // "¡Hola, mundo!"
console.log(result.cached);         // false (first time)
```

##### `translateModelDocuments(model, targetLanguage, query?, options?): Promise<any[]>`
Translates documents from a Mongoose model.

**Parameters:**
- `model`: Mongoose model instance
- `targetLanguage`: Target language code
- `query`: MongoDB query object (optional)
- `options`: Translation options with additional query options

**Example:**
```typescript
const translatedPosts = await localizationService.translateModelDocuments(
  Post,
  'fr',
  { category: 'technology' }, // query
  {
    limit: 10,
    fields: ['title', 'content'],
  }
);
```

##### `translateDocumentById(model, documentId, targetLanguage, options?): Promise<any>`
Translates a single document by ID.

**Parameters:**
- `model`: Mongoose model instance
- `documentId`: Document ID string
- `targetLanguage`: Target language code
- `options`: Translation options

**Example:**
```typescript
const translatedPost = await localizationService.translateDocumentById(
  Post,
  '507f1f77bcf86cd799439011',
  'de'
);
```

##### `translateWithFieldMapping(document, targetLanguage, fieldMapping, options?): Promise<any>`
Translates with custom field name mapping.

**Parameters:**
- `document`: Document to translate
- `targetLanguage`: Target language code
- `fieldMapping`: Object mapping original fields to new field names
- `options`: Translation options

**Example:**
```typescript
const fieldMapping = {
  'name': 'nombre',
  'description': 'descripcion',
};

const result = await localizationService.translateWithFieldMapping(
  document,
  'es',
  fieldMapping
);
```

##### `translateNestedDocument(document, targetLanguage, nestedFields, options?): Promise<any>`
Translates nested objects and arrays.

**Parameters:**
- `document`: Document to translate
- `targetLanguage`: Target language code
- `nestedFields`: Array of field names containing nested documents
- `options`: Translation options

**Example:**
```typescript
const result = await localizationService.translateNestedDocument(
  document,
  'it',
  ['comments', 'reviews'], // fields containing nested documents
  {
    fields: ['text', 'content'], // fields to translate in nested docs
  }
);
```

##### `translateWithProgress(documents, targetLanguage, options?): Promise<any[]>`
Batch translation with progress tracking.

**Parameters:**
- `documents`: Array of documents to translate
- `targetLanguage`: Target language code
- `options`: Translation options with progress callback

**Example:**
```typescript
const results = await localizationService.translateWithProgress(
  documents,
  'pt',
  {
    onProgress: (completed, total) => {
      console.log(`Progress: ${completed}/${total}`);
    },
  }
);
```

### Cache Management

##### `getCacheStats(): Promise<CacheStats>`
Get cache statistics.

**Returns:**
```typescript
interface CacheStats {
  totalKeys: number;
  memoryUsage: string;
  connected: boolean;
}
```

**Example:**
```typescript
const stats = await localizationService.getCacheStats();
console.log(stats);
// { totalKeys: 150, memoryUsage: '2.5MB', connected: true }
```

##### `clearCache(sourceLanguage?, targetLanguage?): Promise<void>`
Clear cache for specific language pairs.

**Parameters:**
- `sourceLanguage`: Source language code (optional, uses config default)
- `targetLanguage`: Target language code (required)

**Example:**
```typescript
// Clear cache for English to Spanish translations
await localizationService.clearCache('en', 'es');
```

## 🌍 Supported Languages

The package supports all languages supported by your chosen AI provider:

### Common Language Codes
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ru` - Russian
- `ja` - Japanese
- `ko` - Korean
- `zh` - Chinese
- `hi` - Hindi
- `ar` - Arabic
- `th` - Thai
- `vi` - Vietnamese
- `tr` - Turkish
- `pl` - Polish
- `nl` - Dutch
- `sv` - Swedish
- `da` - Danish
- `no` - Norwegian

## 💡 Usage Examples

### Basic Document Translation
```typescript
const product = {
  name: 'Wireless Headphones',
  description: 'High-quality wireless headphones with noise cancellation.',
  category: 'Electronics',
  price: 199.99,
  tags: ['wireless', 'bluetooth', 'premium'],
};

const spanishProduct = await localizationService.translateDocument(product, 'es');
const frenchProduct = await localizationService.translateDocument(product, 'fr');
const hindiProduct = await localizationService.translateDocument(product, 'hi');
```

### Mongoose Integration
```typescript
import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  price: Number,
  tags: [String],
});

const Product = mongoose.model('Product', ProductSchema);

// Translate all products
const products = await Product.find();
const translatedProducts = await localizationService.translateDocuments(
  products,
  'ja'
);

// Translate specific products
const techProducts = await localizationService.translateModelDocuments(
  Product,
  'de',
  { category: 'Electronics' },
  { fields: ['name', 'description'] }
);
```

### Field Selection
```typescript
// Translate only specific fields
const result = await localizationService.translateDocument(
  document,
  'ko',
  {
    fields: ['title', 'description', 'tags'],
  }
);

// Exclude specific fields
const result = await localizationService.translateDocument(
  document,
  'zh',
  {
    excludeFields: ['_id', 'price', 'createdAt'],
  }
);
```

### Batch Processing with Progress
```typescript
const documents = await Model.find().limit(1000);
const translatedDocs = await localizationService.translateWithProgress(
  documents,
  'ar',
  {
    batchSize: 50,
    onProgress: (completed, total) => {
      const percentage = Math.round((completed / total) * 100);
      console.log(`Translation progress: ${percentage}%`);
    },
  }
);
```

## 🚀 Performance Tips

1. **Use Redis Caching**: Always use Redis to cache translations and avoid redundant API calls
2. **Batch Processing**: Use batch methods for multiple documents
3. **Field Selection**: Only translate necessary fields to reduce API usage
4. **Cache Management**: Monitor cache usage and clear when needed
5. **Rate Limiting**: Respect AI provider rate limits by adjusting batch sizes
6. **Connection Pooling**: Reuse service instances when possible

## 🔧 Environment Variables

Create a `.env` file:

```env
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-your-openai-api-key
GOOGLE_TRANSLATE_API_KEY=your-google-api-key
AZURE_TRANSLATOR_API_KEY=your-azure-api-key
```

## 📋 Prerequisites

- Node.js 16+
- MongoDB database
- Redis server
- AI API key (OpenAI, Google Translate, or Azure Translator)

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🆘 Support

For issues and questions, please open an issue on GitHub.

## 📊 Changelog

### v1.0.0
- Initial release
- Support for OpenAI, Google Translate, and Azure Translator
- Redis caching implementation
- Mongoose integration
- TypeScript support
- Batch processing with progress tracking
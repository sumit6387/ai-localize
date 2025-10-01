const { LocalizationService } = require('./dist');

async function example() {
  // Configuration
  const config = {
    redisUrl: 'redis://localhost:6379',    // Your Redis URL
    aiApiKey: 'your-openai-api-key',       // Your OpenAI API key
    aiProvider: 'openai',                  // 'openai', 'google', or 'azure'
    sourceLanguage: 'en',                   // Source language
    cacheExpiration: 86400,                 // 24 hours cache
    batchSize: 10,                         // Batch size
  };

  // Create service instance
  const localizationService = new LocalizationService({ config });

  try {
    // Initialize the service (connects to Redis)
    await localizationService.initialize();

    // Example document
    const product = {
      name: 'Wireless Bluetooth Headphones',
      description: 'High-quality wireless headphones with noise cancellation and long battery life.',
      category: 'Electronics',
      price: 199.99,
      tags: ['wireless', 'bluetooth', 'premium'],
    };

    console.log('Original document:', product);

    // Translate to Spanish
    const spanishProduct = await localizationService.translateDocument(product, 'es');
    console.log('\nSpanish translation:', spanishProduct);

    // Translate to Hindi
    const hindiProduct = await localizationService.translateDocument(product, 'hi');
    console.log('\nHindi translation:', hindiProduct);

    // Translate single text
    const singleTranslation = await localizationService.translateText(
      'Hello, how are you?',
      'fr'
    );
    console.log('\nSingle text translation:', singleTranslation);

    // Get cache statistics
    const cacheStats = await localizationService.getCacheStats();
    console.log('\nCache statistics:', cacheStats);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Close connections
    await localizationService.close();
  }
}

// Run the example
example().catch(console.error);

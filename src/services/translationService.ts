import axios, { AxiosResponse } from 'axios';
import { TranslationRequest, TranslationResponse, LocalizationConfig } from '../types';

export class TranslationService {
  constructor(private config: LocalizationConfig) {}

  /**
   * Translate text using the configured AI provider
   */
  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    const { text, targetLanguage, sourceLanguage = 'en' } = request;

    try {
      let translatedText: string;

      switch (this.config.aiProvider) {
        case 'openai':
          translatedText = await this.translateWithOpenAI(text, sourceLanguage, targetLanguage);
          break;
        case 'google':
          translatedText = await this.translateWithGoogle(text, sourceLanguage, targetLanguage);
          break;
        case 'azure':
          translatedText = await this.translateWithAzure(text, sourceLanguage, targetLanguage);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.config.aiProvider}`);
      }

      return {
        translatedText,
        sourceLanguage,
        targetLanguage,
        cached: false,
      };
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage: string = 'en'
  ): Promise<Map<string, string>> {
    const translations = new Map<string, string>();

    try {
      switch (this.config.aiProvider) {
        case 'openai':
          await this.translateBatchWithOpenAI(texts, sourceLanguage, targetLanguage, translations);
          break;
        case 'google':
          await this.translateBatchWithGoogle(texts, sourceLanguage, targetLanguage, translations);
          break;
        case 'azure':
          await this.translateBatchWithAzure(texts, sourceLanguage, targetLanguage, translations);
          break;
        default:
          throw new Error(`Unsupported AI provider: ${this.config.aiProvider}`);
      }

      return translations;
    } catch (error) {
      console.error('Batch translation error:', error);
      throw new Error(`Batch translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Translate with OpenAI API
   */
  private async translateWithOpenAI(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    const response: AxiosResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text, nothing else.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.aiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  /**
   * Translate batch with OpenAI API
   */
  private async translateBatchWithOpenAI(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    translations: Map<string, string>
  ): Promise<void> {
    const batchSize = this.config.batchSize || 10;
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const response: AxiosResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following texts from ${sourceLanguage} to ${targetLanguage}. Return only a JSON array of translated texts in the same order.`
            },
            {
              role: 'user',
              content: JSON.stringify(batch)
            }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.aiApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Clean the response content (remove markdown formatting if present)
      let content = response.data.choices[0].message.content.trim();
      
      // Remove markdown code blocks if present
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const translatedBatch = JSON.parse(content);
      
      batch.forEach((text, index) => {
        translations.set(text, translatedBatch[index]);
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Translate with Google Translate API
   */
  private async translateWithGoogle(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    const response: AxiosResponse = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${this.config.aiApiKey}`,
      {
        q: text,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.translations[0].translatedText;
  }

  /**
   * Translate batch with Google Translate API
   */
  private async translateBatchWithGoogle(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    translations: Map<string, string>
  ): Promise<void> {
    const response: AxiosResponse = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${this.config.aiApiKey}`,
      {
        q: texts,
        source: sourceLanguage,
        target: targetLanguage,
        format: 'text',
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    texts.forEach((text, index) => {
      translations.set(text, response.data.data.translations[index].translatedText);
    });
  }

  /**
   * Translate with Azure Translator API
   */
  private async translateWithAzure(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    const response: AxiosResponse = await axios.post(
      'https://api.cognitive.microsofttranslator.com/translate',
      [
        {
          text: text,
        },
      ],
      {
        params: {
          'api-version': '3.0',
          from: sourceLanguage,
          to: targetLanguage,
        },
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.aiApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data[0].translations[0].text;
  }

  /**
   * Translate batch with Azure Translator API
   */
  private async translateBatchWithAzure(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    translations: Map<string, string>
  ): Promise<void> {
    const response: AxiosResponse = await axios.post(
      'https://api.cognitive.microsofttranslator.com/translate',
      texts.map(text => ({ text })),
      {
        params: {
          'api-version': '3.0',
          from: sourceLanguage,
          to: targetLanguage,
        },
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.aiApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    texts.forEach((text, index) => {
      translations.set(text, response.data[index].translations[0].text);
    });
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<string> {
    try {
      switch (this.config.aiProvider) {
        case 'openai':
          return await this.detectLanguageWithOpenAI(text);
        case 'google':
          return await this.detectLanguageWithGoogle(text);
        case 'azure':
          return await this.detectLanguageWithAzure(text);
        default:
          throw new Error(`Unsupported AI provider: ${this.config.aiProvider}`);
      }
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en'; // Default to English
    }
  }

  private async detectLanguageWithOpenAI(text: string): Promise<string> {
    const response: AxiosResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a language detection expert. Return only the ISO 639-1 language code (e.g., "en", "es", "fr") for the given text.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.aiApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content.trim().toLowerCase();
  }

  private async detectLanguageWithGoogle(text: string): Promise<string> {
    const response: AxiosResponse = await axios.post(
      `https://translation.googleapis.com/language/translate/v2/detect?key=${this.config.aiApiKey}`,
      {
        q: text,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.detections[0][0].language;
  }

  private async detectLanguageWithAzure(text: string): Promise<string> {
    const response: AxiosResponse = await axios.post(
      'https://api.cognitive.microsofttranslator.com/detect',
      [
        {
          text: text,
        },
      ],
      {
        params: {
          'api-version': '3.0',
        },
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.aiApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data[0].language;
  }
}

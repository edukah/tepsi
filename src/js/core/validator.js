import Language from './language.js';

/**
 * Validator — async file validation (type, size, image dimensions).
 *
 * Returns:
 *   { valid: true }
 *   { valid: false, code: 'error_xxx', message: 'localized text' }
 */
class Validator {
  #config;

  constructor (config) {
    this.#config = config;
  }

  /**
   * Validate a file against config rules.
   * Sync checks (type, size) + async check (image dimensions).
   *
   * @param {File} file
   * @returns {Promise<{valid: boolean, code?: string, message?: string}>}
   */
  async validate (file) {
    // 1. MIME type
    if (this.#config.allowedTypes?.length) {
      if (!this.#config.allowedTypes.includes(file.type)) {
        return {
          valid: false,
          code: 'invalid_type',
          message: Language.t('error_invalid_type', {
            name: file.name,
            allowed: this.#config.allowedTypes.join(', ')
          })
        };
      }
    }

    // 2. Size
    if (this.#config.maxSizeMb) {
      const maxBytes = this.#config.maxSizeMb * 1024 * 1024;
      if (file.size > maxBytes) {
        return {
          valid: false,
          code: 'file_too_large',
          message: Language.t('error_too_large', {
            name: file.name,
            maxMb: this.#config.maxSizeMb
          })
        };
      }
    }

    // 3. Image dimensions (async)
    const isImage = file.type.startsWith('image/');
    const checksDimensions = this.#config.minWidth || this.#config.minHeight;

    if (isImage && checksDimensions) {
      let dims;
      try {
        dims = await this.#readImageDimensions(file);
      } catch (err) {
        return {
          valid: false,
          code: 'image_unreadable',
          message: Language.t('error_image_unreadable', { name: file.name })
        };
      }

      if (this.#config.minWidth && dims.width < this.#config.minWidth) {
        return {
          valid: false,
          code: 'image_too_narrow',
          message: Language.t('error_image_too_narrow', {
            name: file.name,
            min: this.#config.minWidth,
            actual: dims.width
          })
        };
      }

      if (this.#config.minHeight && dims.height < this.#config.minHeight) {
        return {
          valid: false,
          code: 'image_too_short',
          message: Language.t('error_image_too_short', {
            name: file.name,
            min: this.#config.minHeight,
            actual: dims.height
          })
        };
      }
    }

    return { valid: true };
  }

  #readImageDimensions (file) {
    return new Promise((resolve, reject) => {
      const url = globalThis.URL.createObjectURL(file);
      const img = new globalThis.Image();

      img.onload = () => {
        globalThis.URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };

      img.onerror = () => {
        globalThis.URL.revokeObjectURL(url);
        reject(new Error('Image load failed'));
      };

      img.src = url;
    });
  }
}

export default Validator;

/**
 * Language — i18n singleton with `{param}` interpolation.
 *
 * Tepsi'nin tüm dosyaları aynı singleton'ı paylaşır.
 * Default 'tr', `Language.setCurrent('en')` ile değişir.
 *
 * @example
 *   Language.t('error_max_count', { max: 10 });
 *   // → 'Maksimum 10 dosya — fazlalar atlandı'
 */
class Language {
  static #current = 'tr';
  static #strings = {};

  /**
   * Register a translation table.
   * @param {string} code - Language code (e.g. 'tr', 'en')
   * @param {Object<string, string>} strings - key → template
   */
  static load (code, strings) {
    Language.#strings[code] = { ...(Language.#strings[code] || {}), ...strings };
  }

  /**
   * Set the active language. Falls back to current if code is unknown.
   * @param {string} code
   */
  static setCurrent (code) {
    if (Language.#strings[code]) {
      Language.#current = code;

      return;
    }
    console.warn(`[Tepsi|Language] '${code}' not loaded — staying on '${Language.#current}'`);
  }

  static getCurrent () {
    return Language.#current;
  }

  /**
   * Translate a key with optional `{param}` interpolation.
   * Falls back to the raw key if not found.
   *
   * @param {string} key
   * @param {Object<string, string|number>} [params]
   * @returns {string}
   */
  static t (key, params) {
    const active = Language.#strings[Language.#current];
    const fallback = Language.#strings.tr;
    const strings = active || fallback || {};
    let template = strings[key] || (fallback && fallback[key]) || key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        template = template.split(`{${k}}`).join(String(v));
      });
    }

    return template;
  }
}

export default Language;

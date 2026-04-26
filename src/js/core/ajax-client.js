import Language from './language.js';

/**
 * AjaxClient — upload/delete network layer with AbortController support.
 *
 * Server contract (Dükkan-uyumlu):
 *   Upload  → POST multipart: file + directory
 *   Delete  → POST multipart: path
 *   Response: { result: bool, message: { success/error/warning/notice: [...] }, path?, name?, size?, mime? }
 */
class AjaxClient {
  #config;

  constructor (config) {
    this.#config = config;
  }

  async upload (file, directory, signal) {
    if (this.#config.mockMode) {
      return this.#mockUpload(file, directory, signal);
    }

    const formData = new globalThis.FormData();
    formData.append('file', file);
    formData.append('directory', directory);

    return this.#request(this.#config.uploadUrl, formData, signal);
  }

  async delete (path, signal) {
    if (this.#config.mockMode) {
      return this.#mockDelete(path, signal);
    }

    const formData = new globalThis.FormData();
    formData.append('path', path);

    return this.#request(this.#config.deleteUrl, formData, signal);
  }

  /**
   * No central abort registry — each slot manages its own AbortController.
   */
  abortAll () {
    // intentional no-op
  }

  // --- Internal ---

  async #request (url, formData, signal) {
    try {
      const response = await globalThis.fetch(url, {
        method: 'POST',
        body: formData,
        signal
      });

      try {
        return await response.json();
      } catch {
        return {
          result: false,
          message: { error: [Language.t('error_response_unreadable', { status: response.status })] }
        };
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;

      return {
        result: false,
        message: { error: [Language.t('error_network', { message: err.message })] }
      };
    }
  }

  // --- Mock implementations (mockMode: true) ---

  async #mockUpload (file, directory, signal) {
    const delay = 1000 + Math.random() * 2000; // 1-3s
    await this.#abortableDelay(delay, signal);

    if (Math.random() > 0.05) {  // ~95% success
      return {
        result: true,
        message: { success: [Language.t('mock_uploaded', { name: file.name })] },
        path: `${directory}/${file.name}`,
        name: file.name,
        size: file.size,
        mime: file.type
      };
    }

    return {
      result: false,
      message: { error: [Language.t('mock_upload_failed', { name: file.name })] }
    };
  }

  async #mockDelete (path, signal) {
    const delay = 500 + Math.random() * 1000; // 0.5-1.5s
    await this.#abortableDelay(delay, signal);

    if (Math.random() > 0.02) {  // ~98% success
      return { result: true, message: { success: [Language.t('mock_deleted', { path })] } };
    }

    return { result: false, message: { error: [Language.t('mock_delete_failed', { path })] } };
  }

  #abortableDelay (ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(this.#abortError());

        return;
      }

      const timeout = globalThis.setTimeout(resolve, ms);

      signal?.addEventListener('abort', () => {
        globalThis.clearTimeout(timeout);
        reject(this.#abortError());
      });
    });
  }

  #abortError () {
    const err = new Error('Aborted');
    err.name = 'AbortError';

    return err;
  }
}

export default AjaxClient;

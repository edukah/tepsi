import Language from './language.js';

/**
 * Slot — individual slot state + DOM + AbortController.
 *
 * State machine: empty → queued → uploading → filled → deleting → empty
 *
 *   empty (placeholder) ─drop/pick─► queued ──► uploading ─result:true─► filled
 *                                                  │
 *                                                  ├─ result:false ──► empty (+ snackbar)
 *                                                  └─ X click (abort) ► empty (+ snackbar)
 *
 *   filled ─X click─► deleting (locked) ─result:true─► empty
 *                                       └─ result:false ─► filled (+ snackbar)
 *
 * Loader pattern: queued/uploading/deleting hepsi aynı `__loader-btn` (ring + iç içe X).
 *   - queued/uploading → X aktif (cancel)
 *   - deleting          → X disabled (server-locked)
 */
class Slot {
  static STATES = ['empty', 'queued', 'uploading', 'filled', 'deleting'];
  static BEM_STATES = ['empty', 'filled'];
  static DYNAMIC_STATES = ['queued', 'uploading', 'deleting'];

  // --- Private Instance Fields ---
  #state = 'empty';
  #file = null;
  #localFile = null;        // original File (for blob preview survival across reorder)
  #blobUrl = null;          // local preview (URL.createObjectURL) — revoked on cleanup
  #element;
  #abortController = null;
  #index;

  constructor (index) {
    this.#index = index;
    this.#element = document.createElement('div');
    this.#element.className = 'tepsi__slot tepsi__slot--empty';
    this.#element.dataset.state = 'empty';
    this.#element.dataset.index = String(index);
    this.#renderEmpty();
  }

  // --- DOM Rendering ---

  #renderEmpty () {
    this.#element.replaceChildren();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'tepsi__add-icon';
    addBtn.setAttribute('aria-label', Language.t('aria_add_file'));
    addBtn.textContent = '+';

    this.#element.appendChild(addBtn);
  }

  #renderQueued () {
    this.#element.replaceChildren();
    this.#element.appendChild(this.#createLoaderBtn(false));
  }

  #renderUploading () {
    this.#element.replaceChildren();
    this.#element.appendChild(this.#createLoaderBtn(false));
  }

  #renderFilled () {
    this.#element.replaceChildren();

    const isImage = this.#file?.mime?.startsWith('image/');
    let preview;

    if (isImage) {
      preview = document.createElement('img');
      preview.className = 'tepsi__preview';
      preview.src = this.#previewUrl();
      preview.alt = this.#file.name || '';
      preview.loading = 'lazy';
      preview.draggable = false;
    } else {
      preview = document.createElement('div');
      preview.className = 'tepsi__preview tepsi__preview--file';
      const ext = document.createElement('span');
      ext.textContent = this.#extension();
      preview.appendChild(ext);
    }
    this.#element.appendChild(preview);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'tepsi__delete-btn';
    deleteBtn.setAttribute('aria-label', Language.t('aria_delete'));
    deleteBtn.textContent = '×';
    this.#element.appendChild(deleteBtn);
  }

  #renderDeleting () {
    this.#renderFilled();
    this.#element.querySelector('.tepsi__delete-btn')?.remove();
    this.#element.appendChild(this.#createLoaderBtn(true));
  }

  /**
   * Tek ortak loader button (uploading/queued/deleting state'leri için).
   * Dönen circular ring + iç içe × icon. Disabled = server-locked (deleting).
   */
  #createLoaderBtn (disabled) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tepsi__loader-btn';
    btn.setAttribute('aria-label', disabled ? Language.t('aria_waiting') : Language.t('aria_cancel'));
    if (disabled) btn.disabled = true;

    // Static SVG markup — XSS-safe (no user input)
    btn.innerHTML =
      '<svg class="tepsi__loader-btn__ring" viewBox="0 0 36 36" aria-hidden="true">' +
        '<circle class="tepsi__loader-btn__ring-bg" cx="18" cy="18" r="16" />' +
        '<circle class="tepsi__loader-btn__ring-fg" cx="18" cy="18" r="16" />' +
      '</svg>' +
      '<span class="tepsi__loader-btn__icon">×</span>';

    return btn;
  }

  /**
   * Resolves preview URL with priority:
   *   1. Local blob URL (just-uploaded file — instant preview, no network)
   *   2. file.previewUrl (caller-provided full URL — edit mode / CDN)
   *   3. file.path (raw — caller must ensure it's a valid src; otherwise broken image)
   */
  #previewUrl () {
    return this.#blobUrl || this.#file?.previewUrl || this.#file?.path || '';
  }

  #extension () {
    const name = this.#file?.name || '';
    const dot = name.lastIndexOf('.');

    return dot > -1 ? name.substring(dot + 1).toUpperCase() : '?';
  }

  // --- State Management ---

  setState (newState) {
    if (!this.#element) return;  // destroyed — pending async response, no-op

    if (!Slot.STATES.includes(newState)) {
      console.error('[Tepsi|Slot] Invalid state:', newState);

      return;
    }

    Slot.BEM_STATES.forEach(s => this.#element.classList.remove(`tepsi__slot--${s}`));
    Slot.DYNAMIC_STATES.forEach(s => this.#element.classList.remove(`is-${s}`));

    this.#state = newState;
    this.#element.dataset.state = newState;

    if (Slot.BEM_STATES.includes(newState)) {
      this.#element.classList.add(`tepsi__slot--${newState}`);
    }

    if (Slot.DYNAMIC_STATES.includes(newState)) {
      this.#element.classList.add(`is-${newState}`);
    }

    switch (newState) {
      case 'empty':     this.#renderEmpty(); break;
      case 'queued':    this.#renderQueued(); break;
      case 'uploading': this.#renderUploading(); break;
      case 'filled':    this.#renderFilled(); break;
      case 'deleting':  this.#renderDeleting(); break;
    }
  }

  /**
   * @param {Object} file - Server data: { path, name, mime, size, previewUrl? }
   * @param {File} [localFile] - Optional original File (for instant blob preview).
   *   Saved internally so reorder can re-create the blob URL without losing the preview.
   */
  setFile (file, localFile) {
    this.#cleanupBlobUrl();
    this.#file = file;
    this.#localFile = localFile || null;

    if (localFile && file?.mime?.startsWith('image/')) {
      this.#blobUrl = globalThis.URL.createObjectURL(localFile);
    }
  }

  clearFile () {
    this.#cleanupBlobUrl();
    this.#file = null;
    this.#localFile = null;
  }

  #cleanupBlobUrl () {
    if (this.#blobUrl) {
      globalThis.URL.revokeObjectURL(this.#blobUrl);
      this.#blobUrl = null;
    }
  }

  abort () {
    this.#abortController?.abort();
    this.#abortController = null;
  }

  setAbortController (controller) {
    this.#abortController = controller;
  }

  destroy () {
    this.abort();
    this.#cleanupBlobUrl();
    this.#element?.remove();
    this.#element = null;  // marker — setState/abort no-op after destroy
    this.#file = null;
    this.#localFile = null;
  }

  get state () { return this.#state; }
  get file () { return this.#file; }
  get localFile () { return this.#localFile; }
  get element () { return this.#element; }
  get index () { return this.#index; }
}

export default Slot;

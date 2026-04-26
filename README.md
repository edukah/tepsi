# Tepsi

Multi-slot file uploader with drag-drop, slot grid UI, and concurrent upload queue. Zero-dependency vanilla JavaScript.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Maintained on best-effort basis. Issues welcome but not guaranteed to be addressed.

## Özellikler

- 🎯 **Slot grid + placeholder** — Etsy stili, kullanıcı limit'i baştan görür
- 👆 **Pointer Events drag-drop** — touch + mouse + pen ortak (mobile-friendly)
- 📁 **External file drop** — browser'dan dosya sürükleyip bırakma (HTML5 D&D)
- 🚀 **3 paralel + queue** — concurrent upload yönetimi
- ⏹️ **Cancel UX** — circular progress + iç içe X (`AbortController`)
- 🔒 **Server-locked delete** — race condition kapısını kapatır
- ✅ **Async validation** — type + size + image dimensions
- 💬 **Hibrit snackbar** — kendi UI default, `onMessage` callback ile override
- 🌍 **i18n** — TR + EN built-in, custom dil yüklenebilir
- 📦 **Zero-dependency** — vanilla JS, peer-dep yok

## Kurulum

```bash
npm install tepsi
```

## Hızlı Başlangıç

```js
import Tepsi from 'tepsi';
import 'tepsi/dist/tepsi.min.css';

new Tepsi('#my-uploader', {
  uploadUrl: 'https://example.com/upload?token=xxx',
  deleteUrl: 'https://example.com/delete?token=xxx',
  directory: 'product/1/100/74',
  maxCount: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSizeMb: 5
});
```

### Browser (no bundler)

**unpkg**

```html
<link rel="stylesheet" href="https://unpkg.com/tepsi/dist/tepsi.min.css">
<script type="module">
  import Tepsi from 'https://unpkg.com/tepsi/dist/tepsi.esm.js';
  new Tepsi('#cont', { uploadUrl: '...', deleteUrl: '...', directory: '...' });
</script>
```

**jsDelivr (npm)**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tepsi/dist/tepsi.min.css">
<script type="module">
  import Tepsi from 'https://cdn.jsdelivr.net/npm/tepsi/dist/tepsi.esm.js';
  new Tepsi('#cont', { uploadUrl: '...', deleteUrl: '...', directory: '...' });
</script>
```

**jsDelivr (GitHub — works without npm publish)**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/edukah/tepsi/dist/tepsi.min.css">
<script type="module">
  import Tepsi from 'https://cdn.jsdelivr.net/gh/edukah/tepsi/dist/tepsi.esm.js';
  new Tepsi('#cont', { uploadUrl: '...', deleteUrl: '...', directory: '...' });
</script>
```

## API

### Constructor

```js
new Tepsi(container, config)
```

| Param | Tip | Açıklama |
|-------|-----|----------|
| `container` | `string \| Element` | CSS selector veya DOM element |
| `config` | `Object` | Aşağıdaki config |

### Config

```js
{
  // Server endpoints (zorunlu)
  uploadUrl: 'https://example.com/upload?token=xxx',
  deleteUrl: 'https://example.com/delete?token=xxx',
  directory: 'product/1/100/74',

  // Slot configuration
  maxCount: 10,                                            // default: 1
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'], // default: image types
  maxSizeMb: 5,                                            // default: 5
  minWidth: 600,                                           // optional, image-only
  minHeight: 600,                                          // optional, image-only

  // Concurrent upload
  maxConcurrent: 3,                                        // default: 3

  // Module options
  dragDrop: true,                                          // default: true

  // Form integration
  hiddenInputName: 'files',                                // default: 'files'

  // Initial state (edit mode — caller provides server-stored files)
  initialFiles: [
    {
      path: 'product/1/100/74/img1.jpg',                           // server path (form submit'te kullanılır)
      name: 'img1.jpg',
      mime: 'image/jpeg',
      size: 12345,
      previewUrl: 'https://cdn.example.com/product/1/100/74/img1.jpg'  // optional — preview için tam URL
    }
  ],

  // Language: 'tr' | 'en' | null (default 'tr', custom via Tepsi.Language.load)
  languageCode: 'tr',

  // Demo / testing — gerçek HTTP yapmaz
  mockMode: false,

  // Callbacks (opsiyonel)
  onUpload: (file) => {},        // file: { path, name, mime, size }
  onDelete: (path) => {},
  onReorder: (paths) => {},      // paths: ordered array
  onMessage: (message) => {},    // override default snackbar — message: Dialog format
  onError: (error, context) => {}
}
```

### Public Methods

```js
const tepsi = new Tepsi('#cont', {...});

tepsi.getFiles()         // → [{path, name, mime, size}, ...] (current state)
tepsi.handleFiles(files) // → process FileList programmatically (validation + upload)
tepsi.reorderSlots(from, to) // → reorder filled slots (compact, Etsy-style)
tepsi.clearAll()         // → all slots cleared (UI only, no AJAX)
tepsi.destroy()          // → cleanup events, DOM, instance
```

### Static Methods

```js
Tepsi.getInstance(element)   // → element?.__tepsi ?? element?.closest('.tepsi')?.__tepsi
Tepsi.help()                 // → console.info usage docs
Tepsi.Language               // → Language singleton (i18n extension)
```

### Hidden Input Auto-Sync

Lib slot state'ini form içine hidden input olarak yansıtır:

```html
<input type="hidden" name="files[0][path]" value="product/1/100/74/img1.jpg">
<input type="hidden" name="files[1][path]" value="product/1/100/74/img2.jpg">
```

Form submit'te bu input'lar otomatik gönderilir, consumer caller DB sync'ini yapar.

## Server Endpoint Contract

Tepsi şu sözleşmeyi bekler. Format **Dükkan'ın `Dialog::getMessages()` çıktısıyla tam uyumlu** — başka PHP framework'leri kolayca adapt edebilir.

### Upload — `POST {uploadUrl}` (multipart: `file` + `directory`)

**Başarılı:**
```json
{
  "result": true,
  "message": { "success": ["Yüklendi"] },
  "path": "product/1/100/74/img1.jpg",
  "name": "img1.jpg",
  "size": 12345,
  "mime": "image/jpeg"
}
```

**Hata:**
```json
{
  "result": false,
  "message": { "error": ["Dosya çok büyük"] }
}
```

### Delete — `POST {deleteUrl}` (multipart: `path`)

**Başarılı:**
```json
{ "result": true, "message": { "success": ["Silindi"] } }
```

**Hata:**
```json
{ "result": false, "message": { "error": ["Yetkiniz yok"] } }
```

### Server Sorumlulukları

- MIME re-validation (client güvenilmez)
- Max size validation
- Filename sanitize (XSS prevention)
- Conflict resolution (`img1.jpg` varsa `img1-2.jpg`)
- Lazy mkdir (klasör yoksa oluştur)
- Path traversal koruması (`..` reject + storage root altı)

## Image Preview

Tepsi'nin önizleme stratejisi — caller'a yük olmadan, lifecycle'a uygun:

| Senaryo | Preview kaynağı |
|---------|-----------------|
| **Yeni upload** (file picker / drag drop) | `URL.createObjectURL(file)` — anında lokal blob URL, network gerek yok. Slot lifecycle ile auto-revoke |
| **Edit mode** (`initialFiles`) — caller `previewUrl` field verir | Server'dan tam URL (CDN, vs.) |
| **Edit mode** — sadece `path` verilir | Raw `path` (caller relative URL'in çalışacağına emin olmalı) |
| **Reorder sonrası** | Lokal blob URL korunur (slot içinde `File` referansı saklanır) |

**Üretimde kullanım — Dükkan örneği:**

```js
new Tepsi('#cont', {
  uploadUrl: '/admin/common/filemanager/upload?token=xxx',
  deleteUrl: '/admin/common/filemanager/delete?token=xxx',
  directory: 'product/1/100/74',
  initialFiles: existingFiles.map(f => ({
    path: f.image,                                       // "product/1/100/74/img.jpg"
    name: f.image.split('/').pop(),
    mime: f.mime,
    size: f.size,
    previewUrl: cdnBase + '/' + f.image                  // "https://cdn.../product/1/100/74/img.jpg"
  }))
});
```

Server upload response'unda `previewUrl` döndürülürse server CDN URL kullanılır, yoksa lokal blob preview default kalır.

## Internationalization (i18n)

Built-in: **TR** (default) + **EN**.

```js
// Config'den ayarla
new Tepsi('#cont', { languageCode: 'en', ... });

// Veya runtime'da değiştir
Tepsi.Language.setCurrent('en');
```

### Custom dil ekleme

```js
Tepsi.Language.load('de', {
  error_max_count: 'Maximum {max} Dateien — Überschuss übersprungen',
  warning_upload_cancelled: 'Upload abgebrochen',
  // ... see translations/tr.js for full key list
});

new Tepsi('#cont', { languageCode: 'de' });
```

Tüm key'ler için: [`src/js/translations/tr.js`](src/js/translations/tr.js)

## Slot State Machine

```
              empty (placeholder)
                    │ drop / click+pick
                    ▼
              queued ──► uploading ─result:true─► filled
                            │
                            ├─ result:false ──► empty (+ snackbar)
                            └─ X click (abort) ► empty (+ snackbar)

              filled ─X click─► deleting (locked) ─result:true─► empty
                                                  └─ result:false ─► filled (+ snackbar)
```

5 state: `empty`, `queued`, `uploading`, `filled`, `deleting`. State formal class değil, CSS class transition'ı + `data-state` attribute ile yönetilir.

## CSS Customization

CSS custom properties:

```css
:root {
  --tepsi-slot-size: 120px;
  --tepsi-slot-gap: 12px;
  --tepsi-slot-radius: 8px;

  --tepsi-color-border: #d0d7de;
  --tepsi-color-border-hover: #8c959f;
  --tepsi-color-border-active: #2196f3;

  --tepsi-color-bg: #ffffff;
  --tepsi-color-bg-empty: #f6f8fa;

  --tepsi-color-error: #d32f2f;
  --tepsi-color-success: #2e7d32;
  --tepsi-color-warning: #f57c00;
  --tepsi-color-text: #1f2328;
}
```

rsBEM CSS classes (selector reference):
```
.tepsi                              # grid container
.tepsi__slot                        # slot block
.tepsi__slot--empty                 # static state
.tepsi__slot--filled
.tepsi__slot.is-queued              # dynamic state (JS-toggled)
.tepsi__slot.is-uploading
.tepsi__slot.is-deleting
.tepsi__slot.is-dragging            # pointer drag in progress
.tepsi__slot.is-drop-target         # drop target highlight
.tepsi__preview                     # filled preview img
.tepsi__delete-btn                  # filled top-right ×
.tepsi__add-icon                    # empty + icon
.tepsi__loader-btn                  # queued/uploading/deleting (ring + iç içe ×)
.tepsi__snackbar                    # default snackbar (overridable via onMessage)
```

## Hibrit Snackbar

Tepsi'nin kendi snackbar'ı default (zero-dep). Consumer `onMessage` callback ile override edebilir:

```js
// Default — Tepsi'nin kendi snackbar'ı
new Tepsi('#cont', { uploadUrl, deleteUrl });

// Override — Sadrazam.Snackbar veya başka bir UI
new Tepsi('#cont', {
  uploadUrl,
  deleteUrl,
  onMessage: (msg) => globalThis.Sadrazam.Snackbar.insert(msg)
});
```

Both accept the same `{ success: [...], error: [...], warning: [...], notice: [...] }` format.

## Build

```bash
npm install
npm run dev      # webpack dev server, port 9004
npm run build    # production ESM build
npm run release  # build + copy dist/* to docs/assets/
```

## Demo

`docs/index.html` — interactive playground (build sonrası dist/'ten okur).
`dev/index.html` — dev mode (`_hot/` path'inden hot reload).

## License

MIT — see [LICENSE](LICENSE)

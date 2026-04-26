# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir.

## [0.1.0] — 2026-04-26

İlk MVP release.

### Eklenen
- Multi-slot file uploader (slot grid + placeholder, Etsy stili)
- **Pointer Events** internal reorder (touch + mouse + pen, mobile-friendly)
- **HTML5 D&D** external file drop (browser → page, desktop)
- **3 paralel + queue** concurrent upload (`maxConcurrent` config)
- **Circular progress + iç içe X** cancel UX (`AbortController`)
- **Server-locked delete** (race protection)
- **Async validation** — type + size + image dimensions (`new Image()`)
- **Hibrit snackbar** — kendi UI default, `onMessage` callback ile override
- **Dükkan-uyumlu server response** format (`{ result, message, path... }`)
- **Hidden input auto-sync** (form integration, `files[N][path]`)
- **Mock mode** (demo + testing without server)
- **i18n** — Built-in TR (default) + EN, runtime switch + custom dil yükleme
- **Zero-dependency** — vanilla JS, peer-dep yok

### Modüler yapı
- `core/` — her zaman çalışır: tepsi, slot, validator, ajax-client, upload-queue, language
- `modules/` — opt-in/configurable: drag-drop (`dragDrop: false` ile devre dışı), snackbar (`onMessage` ile bypass)

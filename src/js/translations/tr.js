export default {
  // --- Errors / messages (snackbar) ---
  error_container_not_found: 'Tepsi: container elementi bulunamadı',
  error_max_count: 'Maksimum {max} dosya — fazlalar atlandı',
  warning_upload_cancelled: 'Yükleme iptal edildi',
  error_unexpected: 'Beklenmeyen hata: {message}',
  error_delete: 'Silme hatası: {message}',

  // --- ARIA labels ---
  aria_add_file: 'Dosya ekle',
  aria_waiting: 'Bekleniyor',
  aria_cancel: 'İptal',
  aria_delete: 'Sil',
  aria_close: 'Kapat',

  // --- Validation ---
  error_invalid_type: 'Dosya tipi geçersiz ({name}) — izin verilenler: {allowed}',
  error_too_large: 'Dosya çok büyük ({name}) — maksimum {maxMb}MB',
  error_image_unreadable: 'Görsel okunamadı ({name})',
  error_image_too_narrow: 'Görsel çok dar ({name}) — minimum {min}px, mevcut {actual}px',
  error_image_too_short: 'Görsel çok kısa ({name}) — minimum {min}px, mevcut {actual}px',

  // --- Network ---
  error_response_unreadable: 'Sunucu cevabı okunamadı (HTTP {status})',
  error_network: 'Ağ hatası: {message}',

  // --- Mock messages (mockMode: true) ---
  mock_uploaded: 'Yüklendi: {name}',
  mock_upload_failed: 'Yükleme hatası: {name}',
  mock_deleted: 'Silindi: {path}',
  mock_delete_failed: 'Silme hatası: {path}'
};

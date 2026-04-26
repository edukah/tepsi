export default {
  // --- Errors / messages (snackbar) ---
  error_container_not_found: 'Tepsi: container element not found',
  error_max_count: 'Maximum {max} files — extras skipped',
  warning_upload_cancelled: 'Upload cancelled',
  error_unexpected: 'Unexpected error: {message}',
  error_delete: 'Delete error: {message}',

  // --- ARIA labels ---
  aria_add_file: 'Add file',
  aria_waiting: 'Waiting',
  aria_cancel: 'Cancel',
  aria_delete: 'Delete',
  aria_close: 'Close',

  // --- Validation ---
  error_invalid_type: 'Invalid file type ({name}) — allowed: {allowed}',
  error_too_large: 'File too large ({name}) — maximum {maxMb}MB',
  error_image_unreadable: 'Image unreadable ({name})',
  error_image_too_narrow: 'Image too narrow ({name}) — minimum {min}px, actual {actual}px',
  error_image_too_short: 'Image too short ({name}) — minimum {min}px, actual {actual}px',

  // --- Network ---
  error_response_unreadable: 'Server response unreadable (HTTP {status})',
  error_network: 'Network error: {message}',

  // --- Mock messages (mockMode: true) ---
  mock_uploaded: 'Uploaded: {name}',
  mock_upload_failed: 'Upload failed: {name}',
  mock_deleted: 'Deleted: {path}',
  mock_delete_failed: 'Delete failed: {path}'
};

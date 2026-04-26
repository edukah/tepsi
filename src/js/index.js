import Tepsi from './core/tepsi.js';
import Language from './core/language.js';
import tr from './translations/tr.js';
import en from './translations/en.js';

// Load built-in languages (TR + EN). Default active = 'tr'.
// Consumer can switch via `new Tepsi(el, { languageCode: 'en' })`
// or load custom translations: `Tepsi.Language.load('de', { ... })`.
Language.load('tr', tr);
Language.load('en', en);

// Expose Language for consumer extensions
Tepsi.Language = Language;

export default Tepsi;

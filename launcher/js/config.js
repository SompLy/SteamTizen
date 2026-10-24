// AeroTizen launcher behaviour and settings. App identities live in app-catalog.js.
window.AeroTizen = window.AeroTizen || {};

AeroTizen.config = {
  APP_ID: 'DclHome001.Home',
  SERVICE_ID: 'DclHome001.Watcher',
  SERVICE_URL: 'http://127.0.0.1:47790',

  STORAGE_KEY: 'aerotizen.settings.v1',
  LEGACY_STORAGE_KEYS: ['hearth.home.v1', 'declutter.home.v5'],

  // Remote control key codes (Tizen TV).
  KEY: { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27, IME_DONE: 65376, IME_CANCEL: 65385 },

  // Apps placed on the home grid the first time, by name prefix, in this order.
  DEFAULT_HOME_APPS: ['youtube', 'netflix', 'prime video', 'stremio', 'spotify'],

  // Real user apps: Samsung-store packages (10-char ids) plus the preinstalled streamers,
  // which the TV's local API knows by their store ids. getAppsInfo() returns ~470 entries;
  // everything else is firmware plumbing.
  STORE_PACKAGE: /^[A-Za-z0-9]{10}$/,
  HIDDEN_APPS: /service|emanual|companion|dummy|widget|DclHome001/i,
  STORE_APP_IDS: ['org.volt.apps', 'com.samsung.tv.store'],
  HBBTV_APP_ID: 'org.tizen.hbbtv',
  HBBTV_LINK_METADATA: 'http://samsung.com/tv/metadata/hbbtv.link',

  FIREPLACE_ID: '__fire',
  FIREPLACE_VIDEO_URL: 'media/fireplace.mp4',  // bundled in the package: plays offline, no TLS quirks

  // Built-in activities (open fullscreen overlays, like the fireplace)
  BUILTIN_APPS: {
    '__fire':   { label: 'Fireplace',   icon: 'flame',  layer: 'fireplace',   module: '' },
    '__snake':  { label: 'Snake',       icon: 'snake',  layer: 'snake-game',  module: 'SnakeGame' },
    '__runner': { label: 'Lane Runner', icon: 'runner', layer: 'runner-game', module: 'RunnerGame' },
    '__farm':   { label: 'Mini Farm',   icon: 'farm',   layer: 'farm-game',   module: 'FarmGame' }
  },
  BUILTIN_IDS: ['__fire', '__snake', '__runner', '__farm'],

  CARD_COLUMNS: { big: 3, small: 5 },  // Settings → App cards
  LONG_PRESS_MS: 600,
  SPEED: { MIN: 0.25, MAX: 3, STEP: 0.25 },

  AMBIENT_MS: 3600000,  // One hour quiet → DVD screensaver (0 disables).
  NIGHT_START: 23,     // Auto night dim window (24h clock); can span midnight.
  NIGHT_END: 7,

  DEFAULTS: {
    home: null,  // null selects defaults on first launch; [] keeps an empty Home.
    cardSize: 'big',
    background: 'steam',
    speed: 1,
    showWeather: true,
    showTime: true,
    showNetwork: true,
    nightDim: true,
    tempUnit: null,  // Select the locale's weather unit when first loaded.
    weatherLocation: null,
    weatherShowLocation: true,
    dateFormat: 'short',
    timeFormat: null,  // Detect 12/24-hour format when first loaded.
    showLiveTv: true,
    hideDisconnectedHdmi: false,
    inputNames: {}
  }
};

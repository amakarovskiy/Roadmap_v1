/* ===== Toast notifications ===== */

function showToast(msg, type) {
  type = type || 'success';
  var container = document.getElementById('toasts');
  if (!container) return;
  var el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function () {
    el.classList.add('removing');
    setTimeout(function () { el.remove(); }, 250);
  }, 3000);
}

/* ===== Rich toast (share hint) ===== */

var _shareHintShown = false;
var _routeRestoredFromURL = false;

function showShareHint() {
  if (_shareHintShown) return;
  _shareHintShown = true;

  var container = document.getElementById('toasts');
  if (!container) return;

  var el = document.createElement('div');
  el.className = 'toast-rich';
  el.style.position = 'relative';
  el.innerHTML =
    '<button class="toast-rich-close">&times;</button>' +
    '<div class="toast-rich-title">Маршрут почти готов</div>' +
    '<div class="toast-rich-desc">Отправь маршрут спутнику или сохрани на завтра</div>' +
    '<div class="toast-rich-actions">' +
      '<button class="toast-rich-btn toast-rich-btn-primary">Отправить спутнику</button>' +
      '<button class="toast-rich-btn toast-rich-btn-secondary">Сохранить на завтра</button>' +
    '</div>';

  function dismissToast() {
    el.classList.add('removing');
    setTimeout(function () { if (el.parentElement) el.remove(); }, 250);
  }

  el.querySelector('.toast-rich-close').addEventListener('click', dismissToast);
  el.querySelector('.toast-rich-btn-primary').addEventListener('click', function () {
    shareCompanionWA(Route.places, Route.getStats());
    dismissToast();
  });
  el.querySelector('.toast-rich-btn-secondary').addEventListener('click', function () {
    saveTripBookmark();
    dismissToast();
  });

  container.appendChild(el);

  // Auto-remove after 8 seconds
  setTimeout(function () {
    if (el.parentElement) {
      el.classList.add('removing');
      setTimeout(function () { el.remove(); }, 250);
    }
  }, 8000);
}

/* ===== Drag & Drop helper ===== */
var _dragFromIdx = -1;

function initDragDrop(panelRef) {
  var routeList = document.querySelector('.route-list');
  if (!routeList) return;

  routeList.addEventListener('dragstart', function (e) {
    var stopEl = e.target.closest('.stop');
    if (!stopEl) return;
    var stops = Array.from(routeList.querySelectorAll('.stop'));
    _dragFromIdx = stops.indexOf(stopEl);
    stopEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  routeList.addEventListener('dragend', function (e) {
    var stopEl = e.target.closest('.stop');
    if (stopEl) stopEl.classList.remove('dragging');
    routeList.querySelectorAll('.stop').forEach(function (s) {
      s.classList.remove('drag-over');
    });
  });

  routeList.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var stopEl = e.target.closest('.stop');
    if (!stopEl) return;
    routeList.querySelectorAll('.stop').forEach(function (s) {
      s.classList.remove('drag-over');
    });
    stopEl.classList.add('drag-over');
  });

  routeList.addEventListener('drop', function (e) {
    e.preventDefault();
    var stopEl = e.target.closest('.stop');
    if (!stopEl) return;
    var stops = Array.from(routeList.querySelectorAll('.stop'));
    var toIdx = stops.indexOf(stopEl);
    if (_dragFromIdx >= 0 && toIdx >= 0 && _dragFromIdx !== toIdx) {
      Route.reorder(_dragFromIdx, toIdx);
    }
    routeList.querySelectorAll('.stop').forEach(function (s) {
      s.classList.remove('drag-over');
    });
    _dragFromIdx = -1;
  });
}

/* ===== Alpine.js panel data ===== */

function panelData() {
  return {
    search: '',
    filter: 'top',
    route: [],
    routeIdSet: {},
    stats: { km: 0, mins: 0, fuel: 0, rubFuel: 0, rubKm: 0 },
    warnings: [],
    menuOpen: false,
    shareOpen: false,
    routeName: '',
    routeRating: null,
    nearbySuggestion: null,
    taxiCost: 0,
    presetsOpen: false,

    get filteredPlaces() {
      var self = this;
      var rIds = self.routeIdSet;
      var list = PLACES;
      if (self.filter !== 'all') {
        list = list.filter(function (p) { return placeMatchesCat(p, self.filter); });
      }
      if (self.search.trim()) {
        var q = self.search.toLowerCase().trim();
        list = list.filter(function (p) {
          return p.name.toLowerCase().indexOf(q) !== -1 ||
                 p.desc.toLowerCase().indexOf(q) !== -1;
        });
      }
      // Stamp each place with _inRoute flag so Alpine re-renders on route change
      return list.map(function (p) {
        return Object.assign({}, p, { _inRoute: !!rIds[p.id] });
      });
    },

    get waLink() {
      return buildWaLink(this.route, this.stats);
    },

    get tgLink() {
      return buildTgLink(this.route, this.stats);
    },

    get googleMapsLink() {
      return buildGoogleMapsLink(this.route);
    },

    get hasThaiGo() {
      return this.route.some(function (p) { return p.cat.includes('office'); });
    },

    init() {
      var self = this;

      // Subscribe to route changes
      Route.onChange(function (data) {
        self.route = data.places;
        // Build a reactive lookup object for route IDs
        var idObj = {};
        data.places.forEach(function (p) { idObj[p.id] = true; });
        self.routeIdSet = idObj;
        self.stats = data.stats;
        self.warnings = data.warnings;
        updateURL();

        // Route name & quality
        self.routeName = generateRouteName(data.places);
        self.routeRating = data.places.length >= 2 ? getRouteRating(data.stats) : null;
        self.nearbySuggestion = findNearbyPlace(data.places);
        self.taxiCost = Math.round(data.stats.km * TAXI_RATE_PER_KM);

        // Show share hint on 3rd point (only if not from URL restore)
        if (!_routeRestoredFromURL && data.places.length === 3) {
          setTimeout(function () { showShareHint(); }, 600);
        }
      });

      // Init map after DOM ready
      this.$nextTick(function () {
        initMap();
        // Restore route from URL
        var params = new URLSearchParams(window.location.search);
        if (params.get('route')) {
          _routeRestoredFromURL = true;
        }
        Route.initFromURL();
        // Apply initial filter
        if (Route.count > 0) {
          self.filter = 'all';
          filterMapMarkers('all');
        } else {
          filterMapMarkers('top');
        }
        // Init drag & drop
        initDragDrop(self);
      });

      // Close popovers on click outside
      document.addEventListener('click', function (e) {
        if (self.shareOpen && !e.target.closest('.share-popover-wrap')) {
          self.shareOpen = false;
        }
        if (self.presetsOpen && !e.target.closest('.presets-wrap')) {
          self.presetsOpen = false;
        }
      });
    },

    setFilter(cat) {
      this.filter = cat;
      filterMapMarkers(cat);
    },

    isInRoute(id) {
      // Use reactive routeIdSet object — Alpine tracks property access on reactive objects
      return !!this.routeIdSet[id];
    },

    togglePlace(place) {
      Route.toggle(place);
    },

    removeStop(id) {
      Route.remove(id);
    },

    clearRoute() {
      Route.clear();
    },

    focusPlace(id) {
      flyToPlace(id);
    },

    shareLink() {
      copyShareLink();
    },

    toggleSharePopover() {
      this.shareOpen = !this.shareOpen;
    },

    shareToCompanionWA() {
      shareCompanionWA(this.route, this.stats);
      this.shareOpen = false;
    },

    shareToCompanionTG() {
      shareCompanionTG(this.route, this.stats);
      this.shareOpen = false;
    },

    copyLink() {
      copyShareLink();
      this.shareOpen = false;
    },

    saveTomorrow() {
      saveTripBookmark();
      this.shareOpen = false;
    },

    optimizeRoute() {
      Route.optimize();
    },

    addSuggestion() {
      if (this.nearbySuggestion) {
        Route.add(this.nearbySuggestion);
      }
    },

    startFromThaiGo() {
      var office = PLACES.find(function (p) { return p.cat.includes('office'); });
      if (office) {
        Route.addFirst(office);
      }
    },

    loadPreset(preset) {
      Route.clear();
      preset.ids.forEach(function (id) {
        var place = PLACES.find(function (p) { return p.id === id; });
        if (place) {
          Route._places.push(place);
        }
      });
      Route._notify();
      this.presetsOpen = false;
      this.filter = 'all';
      filterMapMarkers('all');
      showToast('Маршрут «' + preset.name + '» загружен!');
    },

    generateRandom(mins) {
      var places = generateRandomRoute(mins);
      Route.clear();
      places.forEach(function (p) {
        Route._places.push(p);
      });
      Route._notify();
      this.filter = 'all';
      filterMapMarkers('all');
      showToast('Случайный маршрут создан!');
    },

    togglePresets() {
      this.presetsOpen = !this.presetsOpen;
    },

    rentBikeWA() {
      var msg = 'Хочу арендовать байк для маршрута по Пхукету!';
      if (this.route.length >= 2) {
        msg += '\n\nМой маршрут: ' + this.route.map(function (p) { return p.name; }).join(' → ');
      }
      window.open('https://wa.me/66822545737?text=' + encodeURIComponent(msg), '_blank');
    },

    toggleMenu() {
      this.menuOpen = !this.menuOpen;
    },

    closeMenu() {
      this.menuOpen = false;
    },

    getWarning(key) {
      return WARNINGS_DB[key] || { icon: '⚠️', text: key };
    }
  };
}

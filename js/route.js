/* ===== Route state management ===== */

const Route = {
  _places: [],
  _listeners: [],

  get places() { return this._places.slice(); },
  get ids() { return this._places.map(p => p.id); },
  get count() { return this._places.length; },
  get isFull() { return this._places.length >= MAX_ROUTE_POINTS; },

  has(id) {
    return this._places.some(p => p.id === id);
  },

  indexOf(id) {
    return this._places.findIndex(p => p.id === id);
  },

  add(place) {
    if (this.isFull) {
      showToast('Максимум ' + MAX_ROUTE_POINTS + ' точек в маршруте', 'warn');
      return false;
    }
    if (this.has(place.id)) return false;
    this._places.push(place);
    this._notify();
    showToast(place.name + ' добавлен в маршрут');
    return true;
  },

  remove(id) {
    const idx = this.indexOf(id);
    if (idx === -1) return;
    const place = this._places[idx];
    this._places.splice(idx, 1);
    this._notify();
    showToast(place.name + ' убран из маршрута');
  },

  clear() {
    if (this._places.length === 0) return;
    this._places = [];
    this._notify();
    showToast('Маршрут сброшен');
  },

  toggle(place) {
    if (this.has(place.id)) {
      this.remove(place.id);
    } else {
      this.add(place);
    }
  },

  getStats() {
    return calcStats(this._places);
  },

  getWarnings() {
    const set = new Set();
    this._places.forEach(p => {
      (p.warnings || []).forEach(w => set.add(w));
    });
    const stats = this.getStats();
    if (stats.km > 80) set.add('long_route');
    return Array.from(set);
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  _notify() {
    const data = {
      places: this.places,
      stats: this.getStats(),
      warnings: this.getWarnings()
    };
    this._listeners.forEach(fn => fn(data));
  },

  reorder(fromIdx, toIdx) {
    if (fromIdx < 0 || fromIdx >= this._places.length) return;
    if (toIdx < 0 || toIdx >= this._places.length) return;
    var item = this._places.splice(fromIdx, 1)[0];
    this._places.splice(toIdx, 0, item);
    this._notify();
  },

  addFirst(place) {
    if (this.isFull) {
      showToast('Максимум ' + MAX_ROUTE_POINTS + ' точек в маршруте', 'warn');
      return false;
    }
    if (this.has(place.id)) return false;
    this._places.unshift(place);
    this._notify();
    showToast(place.name + ' добавлен в начало маршрута');
    return true;
  },

  optimize() {
    if (this._places.length < 3) return;
    // Nearest neighbor algorithm for shortest total distance
    var remaining = this._places.slice();
    var optimized = [remaining.shift()]; // start from first point
    while (remaining.length > 0) {
      var last = optimized[optimized.length - 1];
      var nearest = 0;
      var nearestDist = Infinity;
      for (var i = 0; i < remaining.length; i++) {
        var d = haversine(last, remaining[i]);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = i;
        }
      }
      optimized.push(remaining.splice(nearest, 1)[0]);
    }
    this._places = optimized;
    this._notify();
    showToast('Маршрут оптимизирован!');
  },

  initFromURL() {
    const params = new URLSearchParams(window.location.search);
    const routeParam = params.get('route');
    if (!routeParam) return;
    const ids = routeParam.split(',');
    ids.forEach(id => {
      const place = PLACES.find(p => p.id === id);
      if (place && !this.isFull && !this.has(place.id)) {
        this._places.push(place);
      }
    });
    if (this._places.length > 0) {
      this._notify();
    }
  }
};

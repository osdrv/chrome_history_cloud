(function() {
  var HistoryLog, HostLog, IS_DEV, Mapper, Triangle, Vertex, VisitMarker, drawHistory, history, host_log_pool, initRaphael, loadHistory, main, opts, updHostLogVal, _inited, _log;
  _inited = false;
  IS_DEV = true;
  opts = {
    raphael: {
      width: 1000,
      height: 600,
      left: 10,
      top: 10
    },
    history: {
      limit: 1000
    },
    graphics: {
      net_step: 20,
      delta: 0.25,
      R_max: 3,
      R_min: 1,
      approximate: function(v, v_min, v_max, r_min, r_max) {
        if (v_min === v_max) {
          return r_max;
        }
        return r_min + v * (r_max - r_min) / (v_max - v_min);
      },
      scroll_direction: 1
    }
  };
  _log = function(d) {
    return console.log(d);
  };
  history = [];
  host_log_pool = {};
  HistoryLog = new Class({
    initialize: function(data) {
      this.lastVisitTime = data.lastVisitTime || 0;
      this.title = data.title || "";
      this.typedCount = data.typedCount || 0;
      this.url = data.url || "";
      this.visitCount = data.visitCount || 0;
      this.host = "";
      this.sub_host = "";
      this.parseURL();
      return null;
    },
    parseURL: function() {
      var host_parts, parsed_host, parsed_url, sub_host_parts;
      parsed_url = new URI(this.url);
      parsed_host = parsed_url.parsed.host;
      if (parsed_host !== void 0 && parsed_host !== null) {
        parsed_host = parsed_host.replace(/^www\./, "");
      }
      host_parts = parsed_host.split(/\./);
      if (host_parts.length > 2) {
        sub_host_parts = host_parts.slice(0, host_parts.length - 2);
        this.sub_host = sub_host_parts.join(".");
        host_parts = host_parts.slice(-2);
      }
      return this.host = host_parts.join(".");
    },
    isWithoutHost: function() {
      var v, _i, _len, _ref;
      _ref = [void 0, "", null];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        if (v === this.host) {
          return true;
        }
      }
      return false;
    }
  });
  Vertex = new Class({
    initialize: function(x, y) {
      this.state = 0;
      this.x = x;
      this.y = y;
      return null;
    }
  });
  Triangle = new Class({
    initialize: function(data) {
      this.vertexes = data.vertexes || [];
      this.state = 0;
      return null;
    },
    getCenter: function() {
      var vertex, x_sum, y_sum, _i, _len, _ref;
      x_sum = 0;
      y_sum = 0;
      _ref = this.vertexes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vertex = _ref[_i];
        x_sum += vertex.x;
        y_sum += vertex.y;
      }
      return new Vertex(x_sum / 3, y_sum / 3);
    },
    drawOn: function(paper) {
      var tr, vertex, vs, _i, _len;
      vs = this.vertexes;
      tr = paper.set();
      for (_i = 0, _len = vs.length; _i < _len; _i++) {
        vertex = vs[_i];
        tr.push(paper.circle(vertex.x, vertex.y, 2));
      }
      return tr.attr({
        fill: "blue"
      });
    }
  });
  VisitMarker = new Class({
    initialize: function(data) {
      return this.data = data;
    },
    getDim: function() {
      var radius;
      return radius = opts.graphics.approximate(this.data.normalized_val, 0, 1, opts.graphics.R_min, opts.graphics.R_max);
    }
  });
  Mapper = new Class({
    initialize: function(data) {
      var self;
      self = this;
      this.paper = data.paper;
      this.net = {};
      this.triangles = [];
      this.buildNet();
      if (IS_DEV) {
        self.drawNet();
      }
      return null;
    },
    next: function() {},
    prev: function() {},
    drawNet: function() {
      var row, triangle, _i, _len, _ref, _results;
      _ref = this.triangles;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        row = _ref[_i];
        _results.push((function() {
          var _j, _len2, _results2;
          _results2 = [];
          for (_j = 0, _len2 = row.length; _j < _len2; _j++) {
            triangle = row[_j];
            _results2.push(triangle.drawOn(this.paper));
          }
          return _results2;
        }).call(this));
      }
      return _results;
    },
    buildNet: function(cb) {
      var column_index, max_height, max_width, row_index, triangle1, triangle2, x11, x12, x21, x22, x_step, y1, y1_upd, y2, y2_upd, y_step;
      y_step = 0.5 * Math.sqrt(3) * opts.graphics.net_step;
      x_step = opts.graphics.net_step;
      this.triangles = [];
      y1 = 0;
      y2 = y1 + y_step;
      row_index = 0;
      max_width = this.paper.width;
      max_height = this.paper.height;
      while (y2 <= max_height) {
        x11 = 0;
        x21 = 0.5 * x_step;
        if (row_index % 2) {
          y1_upd = y1;
          y2_upd = y2;
        } else {
          y1_upd = y2;
          y2_upd = y1;
        }
        x12 = x11 + x_step;
        x22 = x21 + x_step;
        column_index = 0;
        this.triangles[row_index] = [];
        while (x12 <= max_width) {
          triangle1 = new Triangle({
            vertexes: [new Vertex(x11, y1_upd), new Vertex(x12, y1_upd), new Vertex(x21, y2_upd)]
          });
          this.triangles[row_index][column_index] = triangle1;
          ++column_index;
          if (x22 <= max_width) {
            triangle2 = new Triangle({
              vertexes: [new Vertex(x12, y1_upd), new Vertex(x21, y2_upd), new Vertex(x22, y2_upd)]
            });
            this.triangles[row_index][column_index] = triangle2;
            ++column_index;
          }
          x11 += x_step;
          x12 += x_step;
          x21 += x_step;
          x22 += x_step;
        }
        row_index += 1;
        y1 = y_step * row_index;
        y2 = y1 + y_step;
      }
      if (typeof cb === "function") {
        return cb.call(this);
      }
    },
    getCenterTriangle: function() {
      var triangle, x_index, y_index;
      y_index = Math.round(this.triangles.length / 2) - 1;
      x_index = Math.round(this.triangles[y_index].length / 2) - 1;
      triangle = this.triangles[y_index][x_index];
      return triangle;
    },
    highlightCenterTriangle: function() {
      var center, circle;
      center = this.getCenterTriangle().getCenter();
      circle = this.paper.circle(center.x, center.y, 5);
      return circle.attr({
        fill: "red"
      });
    },
    draw: function(data) {
      var center;
      center = this.getCenterTriangle();
      this.highlightCenterTriangle();
      return _log(data);
    }
  });
  HostLog = new Class({
    initialize: function(data) {
      this.host = data.host || "";
      this.log_pool = [];
      this.visit_counter = 0;
      this.typed_counter = 0;
      this.normalized_val = 0;
      return null;
    },
    appendLog: function(log) {
      this.log_pool.push(log);
      return this._calcCounters();
    },
    getComplexVal: function() {
      return this.visit_counter + this.typed_counter;
    },
    setNormalizedVal: function(val) {
      return this.normalized_val = val;
    },
    _calcCounters: function() {
      var log, typed_counter, visit_counter, _i, _len, _ref;
      visit_counter = 0;
      typed_counter = 0;
      _ref = this.log_pool;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        log = _ref[_i];
        visit_counter += log.visitCount;
        typed_counter += log.typedCount;
      }
      this.visit_counter = visit_counter;
      return this.typed_counter = typed_counter;
    }
  });
  main = function() {
    var paper, self;
    if (_inited) {
      return;
    }
    _inited = true;
    self = this;
    paper = initRaphael();
    return loadHistory(function(data) {
      var data_entry, host_log_val, _i, _len;
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        data_entry = data[_i];
        if (data_entry.isWithoutHost()) {
          continue;
        }
        if (host_log_pool[data_entry.host] === void 0) {
          host_log_pool[data_entry.host] = new HostLog({
            host: data_entry.host
          });
        }
        host_log_pool[data_entry.host].appendLog(data_entry);
      }
      host_log_val = updHostLogVal(host_log_val);
      return drawHistory.call(self, paper, host_log_pool);
    });
  };
  updHostLogVal = function(host_log_val) {
    var host_log, key, max_val, min_val, normalized_val, val;
    min_val = null;
    max_val = null;
    for (key in host_log_pool) {
      host_log = host_log_pool[key];
      val = host_log.getComplexVal();
      if (min_val === null || val < min_val) {
        min_val = val;
      }
      if (max_val === null || val > max_val) {
        max_val = val;
      }
    }
    for (key in host_log_pool) {
      host_log = host_log_pool[key];
      normalized_val = opts.graphics.approximate(host_log.getComplexVal(), min_val, max_val, 0, 1);
      host_log_pool[key].setNormalizedVal(normalized_val);
    }
    return host_log_pool;
  };
  initRaphael = function() {
    return Raphael(opts.raphael.left, opts.raphael.top, opts.raphael.width, opts.raphael.height);
  };
  loadHistory = function(cb) {
    return chrome.history.search({
      text: "",
      maxResults: opts.history.limit
    }, function(data) {
      var data_entry, _i, _len;
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        data_entry = data[_i];
        history.push(new HistoryLog(data_entry));
      }
      if (typeof cb === "function") {
        return cb.call(this, history);
      }
    });
  };
  drawHistory = function(paper, data, cb) {
    var mapper;
    mapper = new Mapper({
      paper: paper
    });
    return mapper.draw(data);
  };
  document.addEventListener('DOMContentLoaded', main, false);
  _inited = false;
  IS_DEV = true;
  opts = {
    raphael: {
      width: 1000,
      height: 600,
      left: 10,
      top: 10
    },
    history: {
      limit: 1000
    },
    graphics: {
      net_step: 20,
      delta: 0.25,
      R_max: 3,
      R_min: 1,
      approximate: function(v, v_min, v_max, r_min, r_max) {
        if (v_min === v_max) {
          return r_max;
        }
        return r_min + v * (r_max - r_min) / (v_max - v_min);
      },
      scroll_direction: 1
    }
  };
  _log = function(d) {
    return console.log(d);
  };
  history = [];
  host_log_pool = {};
  HistoryLog = new Class({
    initialize: function(data) {
      this.lastVisitTime = data.lastVisitTime || 0;
      this.title = data.title || "";
      this.typedCount = data.typedCount || 0;
      this.url = data.url || "";
      this.visitCount = data.visitCount || 0;
      this.host = "";
      this.sub_host = "";
      this.parseURL();
      return null;
    },
    parseURL: function() {
      var host_parts, parsed_host, parsed_url, sub_host_parts;
      parsed_url = new URI(this.url);
      parsed_host = parsed_url.parsed.host;
      if (parsed_host !== void 0 && parsed_host !== null) {
        parsed_host = parsed_host.replace(/^www\./, "");
      }
      host_parts = parsed_host.split(/\./);
      if (host_parts.length > 2) {
        sub_host_parts = host_parts.slice(0, host_parts.length - 2);
        this.sub_host = sub_host_parts.join(".");
        host_parts = host_parts.slice(-2);
      }
      return this.host = host_parts.join(".");
    },
    isWithoutHost: function() {
      var v, _i, _len, _ref;
      _ref = [void 0, "", null];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        if (v === this.host) {
          return true;
        }
      }
      return false;
    }
  });
  Vertex = new Class({
    initialize: function(x, y) {
      this.state = 0;
      this.x = x;
      this.y = y;
      return null;
    }
  });
  Triangle = new Class({
    initialize: function(data) {
      this.vertexes = data.vertexes || [];
      this.state = 0;
      return null;
    },
    getCenter: function() {
      var vertex, x_sum, y_sum, _i, _len, _ref;
      x_sum = 0;
      y_sum = 0;
      _ref = this.vertexes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vertex = _ref[_i];
        x_sum += vertex.x;
        y_sum += vertex.y;
      }
      return new Vertex(x_sum / 3, y_sum / 3);
    },
    drawOn: function(paper) {
      var tr, vertex, vs, _i, _len;
      vs = this.vertexes;
      tr = paper.set();
      for (_i = 0, _len = vs.length; _i < _len; _i++) {
        vertex = vs[_i];
        tr.push(paper.circle(vertex.x, vertex.y, 2));
      }
      return tr.attr({
        fill: "blue"
      });
    }
  });
  VisitMarker = new Class({
    initialize: function(data) {
      return this.data = data;
    },
    getDim: function() {
      var radius;
      return radius = opts.graphics.approximate(this.data.normalized_val, 0, 1, opts.graphics.R_min, opts.graphics.R_max);
    }
  });
  Mapper = new Class({
    initialize: function(data) {
      var self;
      self = this;
      this.paper = data.paper;
      this.net = {};
      this.triangles = [];
      this.buildNet();
      if (IS_DEV) {
        self.drawNet();
      }
      return null;
    },
    next: function() {},
    prev: function() {},
    drawNet: function() {
      var row, triangle, _i, _len, _ref, _results;
      _ref = this.triangles;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        row = _ref[_i];
        _results.push((function() {
          var _j, _len2, _results2;
          _results2 = [];
          for (_j = 0, _len2 = row.length; _j < _len2; _j++) {
            triangle = row[_j];
            _results2.push(triangle.drawOn(this.paper));
          }
          return _results2;
        }).call(this));
      }
      return _results;
    },
    buildNet: function(cb) {
      var column_index, max_height, max_width, row_index, triangle1, triangle2, x11, x12, x21, x22, x_step, y1, y1_upd, y2, y2_upd, y_step;
      y_step = 0.5 * Math.sqrt(3) * opts.graphics.net_step;
      x_step = opts.graphics.net_step;
      this.triangles = [];
      y1 = 0;
      y2 = y1 + y_step;
      row_index = 0;
      max_width = this.paper.width;
      max_height = this.paper.height;
      while (y2 <= max_height) {
        x11 = 0;
        x21 = 0.5 * x_step;
        if (row_index % 2) {
          y1_upd = y1;
          y2_upd = y2;
        } else {
          y1_upd = y2;
          y2_upd = y1;
        }
        x12 = x11 + x_step;
        x22 = x21 + x_step;
        column_index = 0;
        this.triangles[row_index] = [];
        while (x12 <= max_width) {
          triangle1 = new Triangle({
            vertexes: [new Vertex(x11, y1_upd), new Vertex(x12, y1_upd), new Vertex(x21, y2_upd)]
          });
          this.triangles[row_index][column_index] = triangle1;
          ++column_index;
          if (x22 <= max_width) {
            triangle2 = new Triangle({
              vertexes: [new Vertex(x12, y1_upd), new Vertex(x21, y2_upd), new Vertex(x22, y2_upd)]
            });
            this.triangles[row_index][column_index] = triangle2;
            ++column_index;
          }
          x11 += x_step;
          x12 += x_step;
          x21 += x_step;
          x22 += x_step;
        }
        row_index += 1;
        y1 = y_step * row_index;
        y2 = y1 + y_step;
      }
      if (typeof cb === "function") {
        return cb.call(this);
      }
    },
    getCenterTriangle: function() {
      var triangle, x_index, y_index;
      y_index = Math.round(this.triangles.length / 2) - 1;
      x_index = Math.round(this.triangles[y_index].length / 2) - 1;
      triangle = this.triangles[y_index][x_index];
      return triangle;
    },
    highlightCenterTriangle: function() {
      var center, circle;
      center = this.getCenterTriangle().getCenter();
      circle = this.paper.circle(center.x, center.y, 5);
      return circle.attr({
        fill: "red"
      });
    },
    draw: function(data) {
      var center;
      center = this.getCenterTriangle();
      this.highlightCenterTriangle();
      return _log(data);
    }
  });
  HostLog = new Class({
    initialize: function(data) {
      this.host = data.host || "";
      this.log_pool = [];
      this.visit_counter = 0;
      this.typed_counter = 0;
      this.normalized_val = 0;
      return null;
    },
    appendLog: function(log) {
      this.log_pool.push(log);
      return this._calcCounters();
    },
    getComplexVal: function() {
      return this.visit_counter + this.typed_counter;
    },
    setNormalizedVal: function(val) {
      return this.normalized_val = val;
    },
    _calcCounters: function() {
      var log, typed_counter, visit_counter, _i, _len, _ref;
      visit_counter = 0;
      typed_counter = 0;
      _ref = this.log_pool;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        log = _ref[_i];
        visit_counter += log.visitCount;
        typed_counter += log.typedCount;
      }
      this.visit_counter = visit_counter;
      return this.typed_counter = typed_counter;
    }
  });
  main = function() {
    var paper, self;
    if (_inited) {
      return;
    }
    _inited = true;
    self = this;
    paper = initRaphael();
    return loadHistory(function(data) {
      var data_entry, host_log_val, _i, _len;
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        data_entry = data[_i];
        if (data_entry.isWithoutHost()) {
          continue;
        }
        if (host_log_pool[data_entry.host] === void 0) {
          host_log_pool[data_entry.host] = new HostLog({
            host: data_entry.host
          });
        }
        host_log_pool[data_entry.host].appendLog(data_entry);
      }
      host_log_val = updHostLogVal(host_log_val);
      return drawHistory.call(self, paper, host_log_pool);
    });
  };
  updHostLogVal = function(host_log_val) {
    var host_log, key, max_val, min_val, normalized_val, val;
    min_val = null;
    max_val = null;
    for (key in host_log_pool) {
      host_log = host_log_pool[key];
      val = host_log.getComplexVal();
      if (min_val === null || val < min_val) {
        min_val = val;
      }
      if (max_val === null || val > max_val) {
        max_val = val;
      }
    }
    for (key in host_log_pool) {
      host_log = host_log_pool[key];
      normalized_val = opts.graphics.approximate(host_log.getComplexVal(), min_val, max_val, 0, 1);
      host_log_pool[key].setNormalizedVal(normalized_val);
    }
    return host_log_pool;
  };
  initRaphael = function() {
    return Raphael(opts.raphael.left, opts.raphael.top, opts.raphael.width, opts.raphael.height);
  };
  loadHistory = function(cb) {
    return chrome.history.search({
      text: "",
      maxResults: opts.history.limit
    }, function(data) {
      var data_entry, _i, _len;
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        data_entry = data[_i];
        history.push(new HistoryLog(data_entry));
      }
      if (typeof cb === "function") {
        return cb.call(this, history);
      }
    });
  };
  drawHistory = function(paper, data, cb) {
    var mapper;
    mapper = new Mapper({
      paper: paper
    });
    return mapper.draw(data);
  };
  document.addEventListener('DOMContentLoaded', main, false);
}).call(this);

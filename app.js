(function() {
  var DRAW_NET, HistoryLog, HostLog, IS_DEV, Mapper, Triangle, Vertex, VisitMarker, drawHistory, history, host_log_pool, initRaphael, loadHistory, main, opts, updHostLogVal, _inited, _log;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  _inited = false;
  IS_DEV = true;
  DRAW_NET = false;
  opts = {
    raphael: {
      width: 1000,
      height: 600,
      left: 0,
      top: 0
    },
    history: {
      limit: 1000
    },
    graphics: {
      net_step: 20,
      delta: 0.25,
      R_max: 3,
      R_min: 1,
      ring_width: 0.5,
      approximate: function(v, v_min, v_max, r_min, r_max) {
        if (v_min === v_max) {
          return r_max;
        }
        return r_min + v * (r_max - r_min) / (v_max - v_min);
      },
      getMarkerColDim: function(r) {
        return 8 * r + 8;
      },
      getMarkerRowDim: function(r) {
        return 4 * r + 2;
      }
    }
  };
  _log = function(d) {
    return console.log(d);
  };
  history = [];
  host_log_pool = {};
  HistoryLog = (function() {
    function HistoryLog(data) {
      this.lastVisitTime = data.lastVisitTime || 0;
      this.title = data.title || "";
      this.typedCount = data.typedCount || 0;
      this.url = data.url || "";
      this.visitCount = data.visitCount || 0;
      this.host = "";
      this.sub_host = "";
      this.parseURL();
    }
    HistoryLog.prototype.parseURL = function() {
      var host_parts, parsed_host, parsed_url, sub_host_parts;
      parsed_url = new URI(this.url);
      parsed_host = parsed_url.parsed.host;
      if (parsed_host === void 0) {
        return;
      }
      parsed_host = parsed_host != null ? parsed_host.replace(/^www\./, "") : void 0;
      host_parts = parsed_host.split(/\./);
      if (host_parts.length > 2) {
        sub_host_parts = host_parts.slice(0, host_parts.length - 2);
        this.sub_host = sub_host_parts.join(".");
        host_parts = host_parts.slice(-2);
      }
      return this.host = host_parts.join(".");
    };
    HistoryLog.prototype.isWithoutHost = function() {
      var v, _i, _len, _ref;
      _ref = [void 0, "", null];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        if (v === this.host) {
          return true;
        }
      }
      return false;
    };
    return HistoryLog;
  })();
  Vertex = (function() {
    function Vertex(x, y) {
      this.x = x;
      this.y = y;
    }
    return Vertex;
  })();
  Triangle = (function() {
    function Triangle(data) {
      this.vertexes = data.vertexes || [];
      this.state = 0;
      this.index = {
        x: 0,
        y: 0
      };
    }
    Triangle.prototype.getCenter = function() {
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
    };
    Triangle.prototype.setIndex = function(val) {
      this.index.row = val[0];
      return this.index.col = val[1];
    };
    Triangle.prototype.drawOn = function(paper) {
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
    };
    Triangle.prototype.blue = function() {
      return this.state = 1;
    };
    Triangle.prototype.red = function() {
      return this.state = 2;
    };
    Triangle.prototype.isBlue = function() {
      return this.state === 1;
    };
    Triangle.prototype.isWhite = function() {
      return this.state === 0;
    };
    Triangle.prototype.isRed = function() {
      return this.state === 2;
    };
    return Triangle;
  })();
  VisitMarker = (function() {
    function VisitMarker(host_log) {
      this.host_log = host_log;
    }
    VisitMarker.prototype.getRadius = function() {
      return opts.graphics.approximate(this.host_log.normalized_val, 0, 1, opts.graphics.R_min, opts.graphics.R_max);
    };
    VisitMarker.prototype.getDim = function() {
      var r;
      r = this.getRadius();
      return [opts.graphics.getMarkerColDim(r), opts.graphics.getMarkerRowDim(r)];
    };
    VisitMarker.prototype.draw = function(paper, center) {
      var angle, angle_step, channels, i, log_pool, r, sector, stroke, stroke_attr, text_label, visit_log, _i, _len, _results;
      r = this.getRadius() * opts.graphics.net_step;
      this.element = paper.set();
      text_label = paper.text(center.x, center.y + 1.6 * r, this.host_log.host).attr({
        font: "14px Fontin-Sans, Arial",
        fill: "#000"
      });
      this.element.push(text_label);
      log_pool = this.host_log.log_pool;
      if (log_pool.length === 0) {
        return;
      }
      angle = 0;
      angle_step = 360 / log_pool.length;
      stroke_attr = {
        "stroke-width": Math.round(r * opts.graphics.ring_width)
      };
      _results = [];
      for (_i = 0, _len = log_pool.length; _i < _len; _i++) {
        visit_log = log_pool[_i];
        channels = [];
        for (i = 1; i <= 3; i++) {
          channels.push(Math.round(Math.random() * 255));
        }
        stroke = Raphael.rgb.apply(window, channels);
        if (angle_step === 360) {
          sector = paper.circle(center.x, center.y, r).attr({
            stroke: stroke
          }).attr(stroke_attr);
        } else {
          sector = paper.path().attr(stroke_attr).attr({
            stroke: stroke,
            arc: [center.x, center.y, angle, angle + angle_step, r]
          });
        }
        sector.visit_log = visit_log;
        sector.click(function(e) {
          var url;
          url = this.visit_log.url;
          return window.location.href = url;
        });
        sector.hover(function() {
          var g;
          g = this.glow().toBack();
          g.attr({
            "stroke-opacity": 0
          });
          g.animate({
            "stroke-opacity": 1
          }, 300);
          this.data("glow", g);
          return text_label.toFront();
        }, function() {
          var g;
          g = this.data("glow");
          if (g != null) {
            g.animate({
              "stroke-opacity": 0
            }, 300, function() {
              return g.remove();
            });
          }
          this.data("glow", null);
          return text_label.toBack();
        });
        this.element.push(sector);
        _results.push(angle += angle_step);
      }
      return _results;
    };
    return VisitMarker;
  })();
  Mapper = (function() {
    function Mapper(data) {
      this.paper = data.paper;
      this.net = {};
      this.triangles = [];
      this.buildNet();
      if (DRAW_NET) {
        this.drawNet();
      }
      this.direction = [[1, 0]];
      this.transform_matrix = [[0, 1], [-1, 0]];
    }
    Mapper.prototype.drawNet = function() {
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
    };
    Mapper.prototype.buildNet = function(cb) {
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
          triangle1.setIndex([row_index, column_index]);
          this.triangles[row_index][column_index] = triangle1;
          ++column_index;
          if (x22 <= max_width) {
            triangle2 = new Triangle({
              vertexes: [new Vertex(x12, y1_upd), new Vertex(x21, y2_upd), new Vertex(x22, y2_upd)]
            });
            triangle2.setIndex([row_index, column_index]);
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
    };
    Mapper.prototype.getCenterTriangle = function() {
      var triangle, x_index, y_index;
      y_index = Math.round(this.triangles.length / 2) - 1;
      x_index = Math.round(this.triangles[y_index].length / 2) - 1;
      x_index += Math.round(0.5 * x_index);
      triangle = this.triangles[y_index][x_index];
      return triangle;
    };
    Mapper.prototype._changeDirection = function() {
      return this.direction = this._matrixMultiply(this.direction, this.transform_matrix);
    };
    Mapper.prototype._matrixMultiply = function(m1, m2) {
      var ix0, ix1, ix2, res, v, _ref, _ref2, _ref3;
      res = [];
      if (m1[0].length !== m2.length) {
        throw "Wrong matrices dimension given.";
      }
      for (ix2 = 0, _ref = m2[0].length - 1; 0 <= _ref ? ix2 <= _ref : ix2 >= _ref; 0 <= _ref ? ix2++ : ix2--) {
        for (ix1 = 0, _ref2 = m1.length - 1; 0 <= _ref2 ? ix1 <= _ref2 : ix1 >= _ref2; 0 <= _ref2 ? ix1++ : ix1--) {
          v = 0;
          for (ix0 = 0, _ref3 = m2.length - 1; 0 <= _ref3 ? ix0 <= _ref3 : ix0 >= _ref3; 0 <= _ref3 ? ix0++ : ix0--) {
            v += m1[ix1][ix0] * m2[ix0][ix2];
          }
          res[ix1] || (res[ix1] = []);
          res[ix1][ix2] = v;
        }
      }
      return res;
    };
    Mapper.prototype.highlightCenterTriangle = function() {
      return this.highlightTriangle(this.getCenterTriangle());
    };
    Mapper.prototype.highlightTriangle = function(triangle) {
      var center, circle, color, vertex, _i, _len, _ref, _results;
      center = triangle.getCenter();
      circle = this.paper.circle(center.x, center.y, 3);
      color = "white";
      if (triangle.isRed()) {
        color = "red";
      } else if (triangle.isBlue()) {
        color = "blue";
      }
      circle.attr({
        fill: color
      });
      _ref = triangle.vertexes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vertex = _ref[_i];
        _results.push(circle = this.paper.circle(vertex.x, vertex.y, 1));
      }
      return _results;
    };
    Mapper.prototype.getCenterForSizeWithLock = function(size) {
      var cols, current_index, directions_changed, res, rows;
      cols = 1 + Math.floor(size[0]);
      rows = 1 + Math.floor(size[1]);
      this.center_triangle || (this.center_triangle = this.getCenterTriangle());
      directions_changed = 0;
      while (directions_changed < 4) {
        current_index = this.center_triangle.index;
        res = this._tryLockSectorAround(current_index, {
          rows: rows,
          cols: cols
        });
        this._changeDirection();
        ++directions_changed;
        if (res !== null && res.index !== null && res.triangles.length > 0) {
          this.center_triangle = this.getTriangleWithIndex(res.index);
          this._lockTriangles(res.triangles);
          return this._getMassCenter(res.triangles);
        }
      }
      return null;
    };
    Mapper.prototype.getTriangleWithIndex = function(index) {
      var _ref;
      return (_ref = this.triangles[index.row]) != null ? _ref[index.col] : void 0;
    };
    Mapper.prototype._tryLockSectorAround = function(index, size) {
      var bound_cols, bound_rows, bounds, current_col, current_row, i, j, max_col, max_row, paddings, res, size_fits, tmp_triangle, triangle, trunc_col, trunc_row, _ref, _ref2, _ref3, _ref4;
      current_row = index.row;
      current_col = index.col;
      bounds = this.getBoundSize();
      max_row = bounds.rows;
      max_col = bounds.cols;
      triangle = this.getTriangleWithIndex(index);
      trunc_row = Math.floor(size.rows / 2);
      trunc_col = Math.floor(size.cols / 2);
      paddings = {
        top: trunc_row,
        left: trunc_col,
        bottom: size.rows - 1 - trunc_row,
        right: size.cols - 1 - trunc_col
      };
      res = {
        triangles: [],
        index: null
      };
      size_fits = false;
      while (current_row >= paddings.left && current_col >= paddings.top && current_row <= (max_row - paddings.bottom) && current_col <= (max_col - paddings.right) && !size_fits) {
        size_fits = false;
        if (!triangle.isWhite()) {
          current_row += this.direction[0][0];
          current_col += this.direction[0][1];
          triangle = this.getTriangleWithIndex({
            row: current_row,
            col: current_col
          });
          continue;
        } else {
          res.triangles = [];
          res.index = {
            row: current_row,
            col: current_col
          };
          bound_rows = [current_row - paddings.top, current_row + paddings.bottom];
          bound_cols = [current_col - paddings.left, current_col + paddings.right];
          for (i = _ref = bound_rows[0], _ref2 = bound_rows[1]; _ref <= _ref2 ? i <= _ref2 : i >= _ref2; _ref <= _ref2 ? i++ : i--) {
            for (j = _ref3 = bound_cols[0], _ref4 = bound_cols[1]; _ref3 <= _ref4 ? j <= _ref4 : j >= _ref4; _ref3 <= _ref4 ? j++ : j--) {
              tmp_triangle = this.getTriangleWithIndex({
                row: i,
                col: j
              });
              if (bound_rows.indexOf(i) !== -1 && bound_cols.indexOf(j) !== -1) {
                continue;
              }
              if ((tmp_triangle != null) && !tmp_triangle.isRed() && !tmp_triangle.isBlue()) {
                res.triangles.push(tmp_triangle);
              } else {
                size_fits = false;
                break;
                break;
                continue;
              }
            }
          }
          size_fits = true;
        }
      }
      if (!size_fits) {
        return null;
      }
      return res;
    };
    Mapper.prototype._lockTriangles = function(triangles) {
      var bound_cols, bound_rows, i, index, ix, max_col, max_row, min_col, min_row, triangle, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _results;
      _ref = [null, null, null, null], min_row = _ref[0], max_row = _ref[1], min_col = _ref[2], max_col = _ref[3];
      for (_i = 0, _len = triangles.length; _i < _len; _i++) {
        triangle = triangles[_i];
        ix = triangle.index;
        if (ix.col > max_col || max_col === null) {
          max_col = ix.col;
        } else if (ix.col < min_col || min_col === null) {
          min_col = ix.col;
        }
        if (ix.row > max_row || max_row === null) {
          max_row = ix.row;
        } else if (ix.row < min_row || min_row === null) {
          min_row = ix.row;
        }
      }
      bound_cols = [min_col, max_col];
      bound_rows = [min_row, max_row];
      _ref2 = [triangles[0], triangles[triangles.length - 1]];
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        triangle = _ref2[_j];
        bound_rows.push(triangle.index.row);
        bound_cols.push(triangle.index.col);
      }
      i = 0;
      _results = [];
      for (_k = 0, _len3 = triangles.length; _k < _len3; _k++) {
        triangle = triangles[_k];
        index = triangle.index;
        if ((bound_rows.indexOf(triangle.index.row) !== -1) || (bound_cols.indexOf(triangle.index.col) !== -1) && !triangle.isBlue()) {
          this.triangles[index.row][index.col].blue();
        } else {
          this.triangles[index.row][index.col].red();
        }
        _results.push(++i);
      }
      return _results;
    };
    Mapper.prototype._getMassCenter = function(triangles) {
      var center, pos, triangle, _i, _len;
      if (triangles.length === 0) {
        return null;
      }
      pos = {
        x: 0,
        y: 0
      };
      for (_i = 0, _len = triangles.length; _i < _len; _i++) {
        triangle = triangles[_i];
        center = triangle.getCenter();
        pos.x += center.x;
        pos.y += center.y;
      }
      pos.x /= triangles.length;
      pos.y /= triangles.length;
      return new Vertex(pos.x, pos.y);
    };
    Mapper.prototype.getBoundSize = function() {
      return {
        rows: this.triangles.length - 1,
        cols: this.triangles[0].length - 1
      };
    };
    Mapper.prototype.draw = function(data) {
      var center, host_log, host_name, i, marker, _results;
      center = this.getCenterTriangle();
      i = 0;
      _log(data);
      _results = [];
      for (host_name in data) {
        host_log = data[host_name];
        marker = new VisitMarker(host_log);
        center = this.getCenterForSizeWithLock(marker.getDim());
        if (center === null) {
          this.center_triangle = this.getCenterTriangle();
          center = this.getCenterForSizeWithLock(marker.getDim());
        }
        if (center === null) {
          return;
        }
        _results.push(marker.draw(this.paper, center));
      }
      return _results;
    };
    return Mapper;
  })();
  HostLog = (function() {
    function HostLog(data) {
      this.host = data.host || "";
      this.log_pool = [];
      this.visit_counter = 0;
      this.typed_counter = 0;
      this.normalized_val = 0;
    }
    HostLog.prototype.appendLog = function(log) {
      this.log_pool.push(log);
      return this._calcCounters();
    };
    HostLog.prototype.getComplexVal = function() {
      return this.visit_counter + this.typed_counter;
    };
    HostLog.prototype.setNormalizedVal = function(val) {
      return this.normalized_val = val;
    };
    HostLog.prototype._calcCounters = function() {
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
    };
    return HostLog;
  })();
  main = function() {
    var paper;
    if (_inited) {
      return;
    }
    _inited = true;
    paper = initRaphael();
    return loadHistory(__bind(function(data) {
      var data_entry, _i, _len;
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
      host_log_pool = updHostLogVal(host_log_pool);
      return drawHistory.call(this, paper, host_log_pool);
    }, this));
  };
  updHostLogVal = function(host_log_pool) {
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
    var r;
    r = Raphael(0, 0, document.body.clientWidth, opts.raphael.height);
    r.customAttributes.arc = function(x0, y0, angle_from, angle_to, R) {
      var a_from, a_to, long_flag, path, x1, x2, y1, y2, _ref;
      a_from = (90 - angle_from) * Math.PI / 180;
      a_to = (90 - angle_to) * Math.PI / 180;
      x1 = x0 + R * Math.cos(a_from);
      x2 = x0 + R * Math.cos(a_to);
      y1 = y0 - R * Math.sin(a_from);
      y2 = y0 - R * Math.sin(a_to);
      long_flag = +((_ref = angle_from === angle_to) != null ? _ref : {
        "true": (angle_to - angle_from) > 180
      });
      path = [["M", x1, y1], ["A", R, R, 0, long_flag, 1, x2, y2]];
      return {
        path: path
      };
    };
    return r;
  };
  loadHistory = function(cb) {
    return chrome.history.search({
      text: "",
      maxResults: opts.history.limit
    }, __bind(function(data) {
      var data_entry, _i, _len;
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        data_entry = data[_i];
        history.push(new HistoryLog(data_entry));
      }
      if (typeof cb === "function") {
        return cb.call(this, history);
      }
    }, this));
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
  DRAW_NET = false;
  opts = {
    raphael: {
      width: 1000,
      height: 600,
      left: 0,
      top: 0
    },
    history: {
      limit: 1000
    },
    graphics: {
      net_step: 20,
      delta: 0.25,
      R_max: 3,
      R_min: 1,
      ring_width: 0.5,
      approximate: function(v, v_min, v_max, r_min, r_max) {
        if (v_min === v_max) {
          return r_max;
        }
        return r_min + v * (r_max - r_min) / (v_max - v_min);
      },
      getMarkerColDim: function(r) {
        return 8 * r + 8;
      },
      getMarkerRowDim: function(r) {
        return 4 * r + 2;
      }
    }
  };
  _log = function(d) {
    return console.log(d);
  };
  history = [];
  host_log_pool = {};
  HistoryLog = (function() {
    function HistoryLog(data) {
      this.lastVisitTime = data.lastVisitTime || 0;
      this.title = data.title || "";
      this.typedCount = data.typedCount || 0;
      this.url = data.url || "";
      this.visitCount = data.visitCount || 0;
      this.host = "";
      this.sub_host = "";
      this.parseURL();
    }
    HistoryLog.prototype.parseURL = function() {
      var host_parts, parsed_host, parsed_url, sub_host_parts;
      parsed_url = new URI(this.url);
      parsed_host = parsed_url.parsed.host;
      if (parsed_host === void 0) {
        return;
      }
      parsed_host = parsed_host != null ? parsed_host.replace(/^www\./, "") : void 0;
      host_parts = parsed_host.split(/\./);
      if (host_parts.length > 2) {
        sub_host_parts = host_parts.slice(0, host_parts.length - 2);
        this.sub_host = sub_host_parts.join(".");
        host_parts = host_parts.slice(-2);
      }
      return this.host = host_parts.join(".");
    };
    HistoryLog.prototype.isWithoutHost = function() {
      var v, _i, _len, _ref;
      _ref = [void 0, "", null];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        if (v === this.host) {
          return true;
        }
      }
      return false;
    };
    return HistoryLog;
  })();
  Vertex = (function() {
    function Vertex(x, y) {
      this.x = x;
      this.y = y;
    }
    return Vertex;
  })();
  Triangle = (function() {
    function Triangle(data) {
      this.vertexes = data.vertexes || [];
      this.state = 0;
      this.index = {
        x: 0,
        y: 0
      };
    }
    Triangle.prototype.getCenter = function() {
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
    };
    Triangle.prototype.setIndex = function(val) {
      this.index.row = val[0];
      return this.index.col = val[1];
    };
    Triangle.prototype.drawOn = function(paper) {
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
    };
    Triangle.prototype.blue = function() {
      return this.state = 1;
    };
    Triangle.prototype.red = function() {
      return this.state = 2;
    };
    Triangle.prototype.isBlue = function() {
      return this.state === 1;
    };
    Triangle.prototype.isWhite = function() {
      return this.state === 0;
    };
    Triangle.prototype.isRed = function() {
      return this.state === 2;
    };
    return Triangle;
  })();
  VisitMarker = (function() {
    function VisitMarker(host_log) {
      this.host_log = host_log;
    }
    VisitMarker.prototype.getRadius = function() {
      return opts.graphics.approximate(this.host_log.normalized_val, 0, 1, opts.graphics.R_min, opts.graphics.R_max);
    };
    VisitMarker.prototype.getDim = function() {
      var r;
      r = this.getRadius();
      return [opts.graphics.getMarkerColDim(r), opts.graphics.getMarkerRowDim(r)];
    };
    VisitMarker.prototype.draw = function(paper, center) {
      var angle, angle_step, channels, i, log_pool, r, sector, stroke, stroke_attr, text_label, visit_log, _i, _len, _results;
      r = this.getRadius() * opts.graphics.net_step;
      this.element = paper.set();
      text_label = paper.text(center.x, center.y + 1.6 * r, this.host_log.host).attr({
        font: "14px Fontin-Sans, Arial",
        fill: "#000"
      });
      this.element.push(text_label);
      log_pool = this.host_log.log_pool;
      if (log_pool.length === 0) {
        return;
      }
      angle = 0;
      angle_step = 360 / log_pool.length;
      stroke_attr = {
        "stroke-width": Math.round(r * opts.graphics.ring_width)
      };
      _results = [];
      for (_i = 0, _len = log_pool.length; _i < _len; _i++) {
        visit_log = log_pool[_i];
        channels = [];
        for (i = 1; i <= 3; i++) {
          channels.push(Math.round(Math.random() * 255));
        }
        stroke = Raphael.rgb.apply(window, channels);
        if (angle_step === 360) {
          sector = paper.circle(center.x, center.y, r).attr({
            stroke: stroke
          }).attr(stroke_attr);
        } else {
          sector = paper.path().attr(stroke_attr).attr({
            stroke: stroke,
            arc: [center.x, center.y, angle, angle + angle_step, r]
          });
        }
        sector.visit_log = visit_log;
        sector.click(function(e) {
          var url;
          url = this.visit_log.url;
          return window.location.href = url;
        });
        sector.hover(function() {
          var g;
          g = this.glow().toBack();
          g.attr({
            "stroke-opacity": 0
          });
          g.animate({
            "stroke-opacity": 1
          }, 300);
          this.data("glow", g);
          return text_label.toFront();
        }, function() {
          var g;
          g = this.data("glow");
          if (g != null) {
            g.animate({
              "stroke-opacity": 0
            }, 300, function() {
              return g.remove();
            });
          }
          this.data("glow", null);
          return text_label.toBack();
        });
        this.element.push(sector);
        _results.push(angle += angle_step);
      }
      return _results;
    };
    return VisitMarker;
  })();
  Mapper = (function() {
    function Mapper(data) {
      this.paper = data.paper;
      this.net = {};
      this.triangles = [];
      this.buildNet();
      if (DRAW_NET) {
        this.drawNet();
      }
      this.direction = [[1, 0]];
      this.transform_matrix = [[0, 1], [-1, 0]];
    }
    Mapper.prototype.drawNet = function() {
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
    };
    Mapper.prototype.buildNet = function(cb) {
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
          triangle1.setIndex([row_index, column_index]);
          this.triangles[row_index][column_index] = triangle1;
          ++column_index;
          if (x22 <= max_width) {
            triangle2 = new Triangle({
              vertexes: [new Vertex(x12, y1_upd), new Vertex(x21, y2_upd), new Vertex(x22, y2_upd)]
            });
            triangle2.setIndex([row_index, column_index]);
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
    };
    Mapper.prototype.getCenterTriangle = function() {
      var triangle, x_index, y_index;
      y_index = Math.round(this.triangles.length / 2) - 1;
      x_index = Math.round(this.triangles[y_index].length / 2) - 1;
      x_index += Math.round(0.5 * x_index);
      triangle = this.triangles[y_index][x_index];
      return triangle;
    };
    Mapper.prototype._changeDirection = function() {
      return this.direction = this._matrixMultiply(this.direction, this.transform_matrix);
    };
    Mapper.prototype._matrixMultiply = function(m1, m2) {
      var ix0, ix1, ix2, res, v, _ref, _ref2, _ref3;
      res = [];
      if (m1[0].length !== m2.length) {
        throw "Wrong matrices dimension given.";
      }
      for (ix2 = 0, _ref = m2[0].length - 1; 0 <= _ref ? ix2 <= _ref : ix2 >= _ref; 0 <= _ref ? ix2++ : ix2--) {
        for (ix1 = 0, _ref2 = m1.length - 1; 0 <= _ref2 ? ix1 <= _ref2 : ix1 >= _ref2; 0 <= _ref2 ? ix1++ : ix1--) {
          v = 0;
          for (ix0 = 0, _ref3 = m2.length - 1; 0 <= _ref3 ? ix0 <= _ref3 : ix0 >= _ref3; 0 <= _ref3 ? ix0++ : ix0--) {
            v += m1[ix1][ix0] * m2[ix0][ix2];
          }
          res[ix1] || (res[ix1] = []);
          res[ix1][ix2] = v;
        }
      }
      return res;
    };
    Mapper.prototype.highlightCenterTriangle = function() {
      return this.highlightTriangle(this.getCenterTriangle());
    };
    Mapper.prototype.highlightTriangle = function(triangle) {
      var center, circle, color, vertex, _i, _len, _ref, _results;
      center = triangle.getCenter();
      circle = this.paper.circle(center.x, center.y, 3);
      color = "white";
      if (triangle.isRed()) {
        color = "red";
      } else if (triangle.isBlue()) {
        color = "blue";
      }
      circle.attr({
        fill: color
      });
      _ref = triangle.vertexes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vertex = _ref[_i];
        _results.push(circle = this.paper.circle(vertex.x, vertex.y, 1));
      }
      return _results;
    };
    Mapper.prototype.getCenterForSizeWithLock = function(size) {
      var cols, current_index, directions_changed, res, rows;
      cols = 1 + Math.floor(size[0]);
      rows = 1 + Math.floor(size[1]);
      this.center_triangle || (this.center_triangle = this.getCenterTriangle());
      directions_changed = 0;
      while (directions_changed < 4) {
        current_index = this.center_triangle.index;
        res = this._tryLockSectorAround(current_index, {
          rows: rows,
          cols: cols
        });
        this._changeDirection();
        ++directions_changed;
        if (res !== null && res.index !== null && res.triangles.length > 0) {
          this.center_triangle = this.getTriangleWithIndex(res.index);
          this._lockTriangles(res.triangles);
          return this._getMassCenter(res.triangles);
        }
      }
      return null;
    };
    Mapper.prototype.getTriangleWithIndex = function(index) {
      var _ref;
      return (_ref = this.triangles[index.row]) != null ? _ref[index.col] : void 0;
    };
    Mapper.prototype._tryLockSectorAround = function(index, size) {
      var bound_cols, bound_rows, bounds, current_col, current_row, i, j, max_col, max_row, paddings, res, size_fits, tmp_triangle, triangle, trunc_col, trunc_row, _ref, _ref2, _ref3, _ref4;
      current_row = index.row;
      current_col = index.col;
      bounds = this.getBoundSize();
      max_row = bounds.rows;
      max_col = bounds.cols;
      triangle = this.getTriangleWithIndex(index);
      trunc_row = Math.floor(size.rows / 2);
      trunc_col = Math.floor(size.cols / 2);
      paddings = {
        top: trunc_row,
        left: trunc_col,
        bottom: size.rows - 1 - trunc_row,
        right: size.cols - 1 - trunc_col
      };
      res = {
        triangles: [],
        index: null
      };
      size_fits = false;
      while (current_row >= paddings.left && current_col >= paddings.top && current_row <= (max_row - paddings.bottom) && current_col <= (max_col - paddings.right) && !size_fits) {
        size_fits = false;
        if (!triangle.isWhite()) {
          current_row += this.direction[0][0];
          current_col += this.direction[0][1];
          triangle = this.getTriangleWithIndex({
            row: current_row,
            col: current_col
          });
          continue;
        } else {
          res.triangles = [];
          res.index = {
            row: current_row,
            col: current_col
          };
          bound_rows = [current_row - paddings.top, current_row + paddings.bottom];
          bound_cols = [current_col - paddings.left, current_col + paddings.right];
          for (i = _ref = bound_rows[0], _ref2 = bound_rows[1]; _ref <= _ref2 ? i <= _ref2 : i >= _ref2; _ref <= _ref2 ? i++ : i--) {
            for (j = _ref3 = bound_cols[0], _ref4 = bound_cols[1]; _ref3 <= _ref4 ? j <= _ref4 : j >= _ref4; _ref3 <= _ref4 ? j++ : j--) {
              tmp_triangle = this.getTriangleWithIndex({
                row: i,
                col: j
              });
              if (bound_rows.indexOf(i) !== -1 && bound_cols.indexOf(j) !== -1) {
                continue;
              }
              if ((tmp_triangle != null) && !tmp_triangle.isRed() && !tmp_triangle.isBlue()) {
                res.triangles.push(tmp_triangle);
              } else {
                size_fits = false;
                break;
                break;
                continue;
              }
            }
          }
          size_fits = true;
        }
      }
      if (!size_fits) {
        return null;
      }
      return res;
    };
    Mapper.prototype._lockTriangles = function(triangles) {
      var bound_cols, bound_rows, i, index, ix, max_col, max_row, min_col, min_row, triangle, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _results;
      _ref = [null, null, null, null], min_row = _ref[0], max_row = _ref[1], min_col = _ref[2], max_col = _ref[3];
      for (_i = 0, _len = triangles.length; _i < _len; _i++) {
        triangle = triangles[_i];
        ix = triangle.index;
        if (ix.col > max_col || max_col === null) {
          max_col = ix.col;
        } else if (ix.col < min_col || min_col === null) {
          min_col = ix.col;
        }
        if (ix.row > max_row || max_row === null) {
          max_row = ix.row;
        } else if (ix.row < min_row || min_row === null) {
          min_row = ix.row;
        }
      }
      bound_cols = [min_col, max_col];
      bound_rows = [min_row, max_row];
      _ref2 = [triangles[0], triangles[triangles.length - 1]];
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        triangle = _ref2[_j];
        bound_rows.push(triangle.index.row);
        bound_cols.push(triangle.index.col);
      }
      i = 0;
      _results = [];
      for (_k = 0, _len3 = triangles.length; _k < _len3; _k++) {
        triangle = triangles[_k];
        index = triangle.index;
        if ((bound_rows.indexOf(triangle.index.row) !== -1) || (bound_cols.indexOf(triangle.index.col) !== -1) && !triangle.isBlue()) {
          this.triangles[index.row][index.col].blue();
        } else {
          this.triangles[index.row][index.col].red();
        }
        _results.push(++i);
      }
      return _results;
    };
    Mapper.prototype._getMassCenter = function(triangles) {
      var center, pos, triangle, _i, _len;
      if (triangles.length === 0) {
        return null;
      }
      pos = {
        x: 0,
        y: 0
      };
      for (_i = 0, _len = triangles.length; _i < _len; _i++) {
        triangle = triangles[_i];
        center = triangle.getCenter();
        pos.x += center.x;
        pos.y += center.y;
      }
      pos.x /= triangles.length;
      pos.y /= triangles.length;
      return new Vertex(pos.x, pos.y);
    };
    Mapper.prototype.getBoundSize = function() {
      return {
        rows: this.triangles.length - 1,
        cols: this.triangles[0].length - 1
      };
    };
    Mapper.prototype.draw = function(data) {
      var center, host_log, host_name, i, marker, _results;
      center = this.getCenterTriangle();
      i = 0;
      _log(data);
      _results = [];
      for (host_name in data) {
        host_log = data[host_name];
        marker = new VisitMarker(host_log);
        center = this.getCenterForSizeWithLock(marker.getDim());
        if (center === null) {
          this.center_triangle = this.getCenterTriangle();
          center = this.getCenterForSizeWithLock(marker.getDim());
        }
        if (center === null) {
          return;
        }
        _results.push(marker.draw(this.paper, center));
      }
      return _results;
    };
    return Mapper;
  })();
  HostLog = (function() {
    function HostLog(data) {
      this.host = data.host || "";
      this.log_pool = [];
      this.visit_counter = 0;
      this.typed_counter = 0;
      this.normalized_val = 0;
    }
    HostLog.prototype.appendLog = function(log) {
      this.log_pool.push(log);
      return this._calcCounters();
    };
    HostLog.prototype.getComplexVal = function() {
      return this.visit_counter + this.typed_counter;
    };
    HostLog.prototype.setNormalizedVal = function(val) {
      return this.normalized_val = val;
    };
    HostLog.prototype._calcCounters = function() {
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
    };
    return HostLog;
  })();
  main = function() {
    var paper;
    if (_inited) {
      return;
    }
    _inited = true;
    paper = initRaphael();
    return loadHistory(__bind(function(data) {
      var data_entry, _i, _len;
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
      host_log_pool = updHostLogVal(host_log_pool);
      return drawHistory.call(this, paper, host_log_pool);
    }, this));
  };
  updHostLogVal = function(host_log_pool) {
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
    var r;
    r = Raphael(0, 0, document.body.clientWidth, opts.raphael.height);
    r.customAttributes.arc = function(x0, y0, angle_from, angle_to, R) {
      var a_from, a_to, long_flag, path, x1, x2, y1, y2, _ref;
      a_from = (90 - angle_from) * Math.PI / 180;
      a_to = (90 - angle_to) * Math.PI / 180;
      x1 = x0 + R * Math.cos(a_from);
      x2 = x0 + R * Math.cos(a_to);
      y1 = y0 - R * Math.sin(a_from);
      y2 = y0 - R * Math.sin(a_to);
      long_flag = +((_ref = angle_from === angle_to) != null ? _ref : {
        "true": (angle_to - angle_from) > 180
      });
      path = [["M", x1, y1], ["A", R, R, 0, long_flag, 1, x2, y2]];
      return {
        path: path
      };
    };
    return r;
  };
  loadHistory = function(cb) {
    return chrome.history.search({
      text: "",
      maxResults: opts.history.limit
    }, __bind(function(data) {
      var data_entry, _i, _len;
      for (_i = 0, _len = data.length; _i < _len; _i++) {
        data_entry = data[_i];
        history.push(new HistoryLog(data_entry));
      }
      if (typeof cb === "function") {
        return cb.call(this, history);
      }
    }, this));
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

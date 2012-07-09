_inited = false
IS_DEV = true

opts =
  raphael:
    width: 1000
    height: 600
    left: 10
    top: 10
  history:
    limit: 1000
  graphics:
    net_step: 20
    delta: 0.25
    R_max: 3
    R_min: 1
    approximate: ( v, v_min, v_max, r_min, r_max ) ->
      if v_min == v_max
        return r_max
      r_min + v * ( r_max - r_min ) / ( v_max - v_min )
    scroll_direction: 1 # clockwise

_log = ( d ) ->
  console.log( d )

history = []

host_log_pool = {}

HistoryLog = new Class({
  initialize: ( data ) ->
    this.lastVisitTime = data.lastVisitTime || 0
    this.title = data.title || ""
    this.typedCount = data.typedCount || 0
    this.url = data.url || ""
    this.visitCount = data.visitCount || 0
    this.host = ""
    this.sub_host = ""
    this.parseURL()
    null

  parseURL: () ->
    parsed_url = new URI( this.url )
    parsed_host = parsed_url.parsed.host
    parsed_host = parsed_host.replace( /^www\./, "" ) if parsed_host != undefined && parsed_host != null
    host_parts = parsed_host.split( /\./ )
    if host_parts.length > 2
      sub_host_parts = host_parts.slice( 0, host_parts.length - 2 )
      this.sub_host = sub_host_parts.join( "." )
      host_parts = host_parts.slice( -2 )
    this.host = host_parts.join( "." )

  isWithoutHost: () ->
    for v in [ undefined, "", null ]
      if v == this.host
        return true
    false
})

Vertex = new Class({
  initialize: ( x, y ) ->
    this.state = 0 # white
    this.x = x
    this.y = y
    null
})

Triangle = new Class({
  initialize: ( data ) ->
    this.vertexes = data.vertexes || []
    this.state = 0 # white
    null

  getCenter: () ->
    x_sum = 0
    y_sum = 0
    for vertex in this.vertexes
      x_sum += vertex.x
      y_sum += vertex.y
    new Vertex( x_sum / 3, y_sum / 3 )

  drawOn: ( paper ) ->
    vs = this.vertexes
    tr = paper.set()
    for vertex in vs
      tr.push( paper.circle( vertex.x, vertex.y, 2 ) )
    tr.attr({ fill: "blue" })
})

VisitMarker = new Class({
  initialize: ( data ) ->
    this.data = data
  getDim: () ->
    radius = opts.graphics.approximate(
      this.data.normalized_val,
      0,
      1,
      opts.graphics.R_min,
      opts.graphics.R_max
    )
    
})

Mapper = new Class( {
  initialize: ( data ) ->
    self = this
    this.paper = data.paper
    this.net = {}
    this.triangles = []
    this.buildNet()
    self.drawNet() if IS_DEV
    null

  next: () ->
    # next

  prev: () ->
    #prev

  drawNet: () ->
    for row in this.triangles
      for triangle in row
        triangle.drawOn( this.paper )

  buildNet: ( cb ) ->
    y_step = 0.5 * Math.sqrt( 3 ) * opts.graphics.net_step
    x_step = opts.graphics.net_step
    this.triangles = []
    y1 = 0
    y2 = y1 + y_step
    row_index = 0
    max_width = this.paper.width
    max_height = this.paper.height
    while y2 <= max_height
      x11 = 0
      x21 = 0.5 * x_step
      if row_index % 2
        y1_upd = y1
        y2_upd = y2
      else
        y1_upd = y2
        y2_upd = y1
      x12 = x11 + x_step
      x22 = x21 + x_step
      column_index = 0
      this.triangles[ row_index ] = []
      while x12 <= max_width
        triangle1 = new Triangle({ vertexes: [
          new Vertex( x11, y1_upd ),
          new Vertex( x12, y1_upd ),
          new Vertex( x21, y2_upd )
        ] })
        this.triangles[ row_index ][ column_index ] = triangle1
        ++column_index
        if x22 <= max_width
          triangle2 = new Triangle({ vertexes: [
            new Vertex( x12, y1_upd ),
            new Vertex( x21, y2_upd ),
            new Vertex( x22, y2_upd )
          ] })
          this.triangles[ row_index ][ column_index ] = triangle2
          ++column_index
        x11 += x_step
        x12 += x_step
        x21 += x_step
        x22 += x_step
      row_index += 1
      y1 = y_step * row_index
      y2 = y1 + y_step
    if typeof( cb ) == "function"
      cb.call( this )

  getCenterTriangle: () ->
    y_index = Math.round( this.triangles.length / 2 ) - 1
    x_index = Math.round( this.triangles[ y_index ].length / 2 ) - 1
    triangle = this.triangles[ y_index ][ x_index ]
    triangle
  
  highlightCenterTriangle: () ->
    center = this.getCenterTriangle().getCenter()
    circle = this.paper.circle( center.x, center.y, 5 )
    circle.attr( { fill: "red" } )

  draw: ( data ) ->
    center = this.getCenterTriangle()
    this.highlightCenterTriangle()
    _log( data )
})

HostLog = new Class( {
  initialize: ( data ) ->
    this.host = data.host || ""
    this.log_pool = []
    this.visit_counter = 0
    this.typed_counter = 0
    this.normalized_val = 0
    null

  appendLog: ( log ) ->
    this.log_pool.push( log )
    this._calcCounters()
  
  getComplexVal: () ->
    this.visit_counter + this.typed_counter

  setNormalizedVal: ( val ) ->
    this.normalized_val = val

  _calcCounters: () ->
    visit_counter = 0
    typed_counter = 0
    for log in this.log_pool
      visit_counter += log.visitCount
      typed_counter += log.typedCount
    this.visit_counter = visit_counter
    this.typed_counter = typed_counter
})

main = () ->
  return if _inited
  _inited = true
  self= this
  paper = initRaphael()
  loadHistory( ( data ) ->
    for data_entry in data
      continue if data_entry.isWithoutHost()
      if host_log_pool[ data_entry.host ] == undefined
        host_log_pool[ data_entry.host ] = new HostLog( { host: data_entry.host } )
      host_log_pool[ data_entry.host ].appendLog( data_entry )
    host_log_val = updHostLogVal( host_log_val )
    drawHistory.call( self, paper, host_log_pool )
  )

updHostLogVal = ( host_log_val ) ->
  min_val = null
  max_val = null
  for key, host_log of host_log_pool
    val = host_log.getComplexVal()
    if min_val == null || val < min_val
      min_val = val
    if max_val == null || val > max_val
      max_val = val
  for key, host_log of host_log_pool
    normalized_val = opts.graphics.approximate(
      host_log.getComplexVal(),
      min_val,
      max_val,
      0,
      1
    )
    host_log_pool[ key ].setNormalizedVal( normalized_val )
  host_log_pool

initRaphael = () ->
  Raphael(
    opts.raphael.left,
    opts.raphael.top,
    opts.raphael.width,
    opts.raphael.height
  )

loadHistory = ( cb ) ->
  chrome.history.search( { text: "", maxResults: opts.history.limit }, ( data ) ->
    for data_entry in data
      history.push( new HistoryLog( data_entry ) )
    cb.call( this, history ) if typeof( cb ) == "function"
  )

drawHistory = ( paper, data, cb ) ->
  mapper = new Mapper( { paper: paper } )
  mapper.draw( data )

document.addEventListener( 'DOMContentLoaded', main, false )

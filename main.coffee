_inited = false
IS_DEV = true
DRAW_NET = false

opts =
  raphael:
    width: 1000
    height: 600
    left: 0
    top: 0
  history:
    limit: 1000
  graphics:
    net_step: 20
    delta: 0.25
    R_max: 3
    R_min: 1
    ring_width: 0.5
    approximate: ( v, v_min, v_max, r_min, r_max ) ->
      if v_min == v_max
        return r_max
      r_min + v * ( r_max - r_min ) / ( v_max - v_min )
    getMarkerColDim: ( r ) ->
      8 * r + 8
    getMarkerRowDim: ( r ) ->
      4 * r + 2

_log = ( d ) ->
  console.log( d )

history = []

host_log_pool = {}

class HistoryLog
  constructor: ( data ) ->
    @lastVisitTime = data.lastVisitTime || 0
    @title = data.title || ""
    @typedCount = data.typedCount || 0
    @url = data.url || ""
    @visitCount = data.visitCount || 0
    @host = ""
    @sub_host = ""
    @parseURL()

  parseURL: () ->
    parsed_url = new URI( @url )
    parsed_host = parsed_url.parsed.host
    return if parsed_host is undefined
    parsed_host = parsed_host?.replace( /^www\./, "" )
    host_parts = parsed_host.split( /\./ )
    if host_parts.length > 2
      sub_host_parts = host_parts.slice( 0, host_parts.length - 2 )
      @sub_host = sub_host_parts.join( "." )
      host_parts = host_parts.slice( -2 )
    @host = host_parts.join( "." )

  isWithoutHost: () ->
    for v in [ undefined, "", null ]
      return true if v is @host
    false

class Vertex
  constructor: ( x, y ) ->
    @x = x
    @y = y

class Triangle
  constructor: ( data ) ->
    @vertexes = data.vertexes || []
    @state = 0 # white
    @index = { x: 0, y : 0 }

  getCenter: () ->
    x_sum = 0
    y_sum = 0
    for vertex in @vertexes
      x_sum += vertex.x
      y_sum += vertex.y
    new Vertex( x_sum / 3, y_sum / 3 )

  setIndex: ( val ) ->
    @index.row = val[ 0 ]
    @index.col = val[ 1 ]

  drawOn: ( paper ) ->
    vs = @vertexes
    tr = paper.set()
    for vertex in vs
      tr.push( paper.circle( vertex.x, vertex.y, 2 ) )
    tr.attr({ fill: "blue" })

  blue: () ->
    @state = 1

  red: () ->
    @state = 2

  isBlue: () ->
    @state is 1

  isWhite: () ->
    @state is 0

  isRed: () ->
    @state is 2


class VisitMarker
  constructor: ( host_log ) ->
    @host_log = host_log

  getRadius: () ->
    opts.graphics.approximate(
      @host_log.normalized_val,
      0,
      1,
      opts.graphics.R_min,
      opts.graphics.R_max
    )

  getDim: () ->
    r = @getRadius()
    [ opts.graphics.getMarkerColDim( r ), opts.graphics.getMarkerRowDim( r ) ]
  
  draw: ( paper, center ) ->
    r = @getRadius() * opts.graphics.net_step
    @element = paper.set()
    text_label = paper.text( center.x, center.y + 1.6 * r, @host_log.host ).attr( { font: "14px Fontin-Sans, Arial", fill: "#000" } )
    @element.push( text_label )
    log_pool = @host_log.log_pool
    return if log_pool.length is 0
    angle = 0
    angle_step = 360 / log_pool.length
    stroke_attr = { "stroke-width": Math.round( r * opts.graphics.ring_width ) }
    for visit_log in log_pool
      #while angle < 360
      channels = []
      for i in [ 1..3 ]
        channels.push( Math.round( Math.random() * 255 ) )
      stroke = Raphael.rgb.apply( window, channels )
      if angle_step is 360
        sector = paper.circle( center.x, center.y, r ).attr( stroke: stroke ).attr( stroke_attr )
      else
        sector = paper.path().attr( stroke_attr ).attr( stroke: stroke, arc: [ center.x, center.y, angle, angle + angle_step, r ] )
      sector.visit_log = visit_log
      sector.click( ( e ) ->
        url = this.visit_log.url
        window.location.href = url
      )
      sector.hover( () ->
        g = this.glow().toBack()
        g.attr( "stroke-opacity": 0 )
        g.animate( { "stroke-opacity": 1 }, 300 )
        this.data( "glow", g )
        text_label.toFront()
      , () ->
        g = this.data( "glow" )
        if g?
          g.animate( { "stroke-opacity": 0 }, 300, () ->
            g.remove()
          )
        this.data( "glow", null )
        text_label.toBack()
      )
      @element.push(
        sector
      )
      angle += angle_step



class Mapper
  constructor: ( data ) ->
    @paper = data.paper
    @net = {}
    @triangles = []
    @buildNet()
    @drawNet() if DRAW_NET
    @direction = [ [ 1, 0 ] ]
    @transform_matrix = [ [ 0, 1 ], [ -1, 0 ] ]

  drawNet: () ->
    for row in @triangles
      for triangle in row
        triangle.drawOn( @paper )

  buildNet: ( cb ) ->
    y_step = 0.5 * Math.sqrt( 3 ) * opts.graphics.net_step
    x_step = opts.graphics.net_step
    @triangles = []
    y1 = 0
    y2 = y1 + y_step
    row_index = 0
    max_width = @paper.width
    max_height = @paper.height
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
      @triangles[ row_index ] = []
      while x12 <= max_width
        triangle1 = new Triangle({ vertexes: [
          new Vertex( x11, y1_upd ),
          new Vertex( x12, y1_upd ),
          new Vertex( x21, y2_upd )
        ] })
        triangle1.setIndex( [ row_index, column_index ] )
        @triangles[ row_index ][ column_index ] = triangle1
        ++column_index
        if x22 <= max_width
          triangle2 = new Triangle({ vertexes: [
            new Vertex( x12, y1_upd ),
            new Vertex( x21, y2_upd ),
            new Vertex( x22, y2_upd )
          ] })
          triangle2.setIndex( [ row_index, column_index ] )
          @triangles[ row_index ][ column_index ] = triangle2
          ++column_index
        x11 += x_step
        x12 += x_step
        x21 += x_step
        x22 += x_step
      row_index += 1
      y1 = y_step * row_index
      y2 = y1 + y_step
    cb.call( @ ) if typeof( cb ) is "function"

  getCenterTriangle: () ->
    y_index = Math.round( @triangles.length / 2 ) - 1
    x_index = Math.round( @triangles[ y_index ].length / 2 ) - 1
    x_index += Math.round( 0.5 * x_index )
    triangle = this.triangles[ y_index ][ x_index ]
    triangle
  
  _changeDirection: () ->
    @direction = @_matrixMultiply( @direction, @transform_matrix )

  # multiplies 2 matrices
  _matrixMultiply: ( m1, m2 ) ->
    res = []
    throw "Wrong matrices dimension given." if m1[ 0 ].length isnt m2.length
    for ix2 in [ 0..( m2[0].length - 1 ) ]
      for ix1 in [ 0..( m1.length - 1 ) ]
        v = 0
        for ix0 in [ 0..( m2.length - 1 ) ]
          v += m1[ ix1 ][ ix0 ] * m2[ ix0 ][ ix2 ]
        res[ ix1 ] ||= []
        res[ ix1 ][ ix2 ] = v
    res

  highlightCenterTriangle: () ->
    @highlightTriangle( @getCenterTriangle() )

  highlightTriangle: ( triangle ) ->
    center = triangle.getCenter()
    circle = @paper.circle( center.x, center.y, 3 )
    color = "white"
    if triangle.isRed()
      color = "red"
    else if triangle.isBlue()
      color = "blue"
    circle.attr( { fill: color } )
    for vertex in triangle.vertexes
      circle = @paper.circle( vertex.x, vertex.y, 1 )

  getCenterForSizeWithLock: ( size ) ->
    cols = 1 + Math.floor( size[ 0 ] )
    rows = 1 + Math.floor( size[ 1 ] )
    @center_triangle ||= @getCenterTriangle()
    directions_changed = 0

    while directions_changed < 4
      current_index = @center_triangle.index
      res = @_tryLockSectorAround( current_index, { rows: rows, cols: cols } )
      @_changeDirection()
      ++directions_changed
      if res isnt null and res.index isnt null and res.triangles.length > 0
        @center_triangle = @getTriangleWithIndex( res.index )
        @_lockTriangles( res.triangles )
        #for triangle in res.triangles
        #  @highlightTriangle( triangle )
        return @_getMassCenter( res.triangles )
    null
 
  getTriangleWithIndex: ( index ) ->
    @triangles[ index.row ]?[ index.col ]

  _tryLockSectorAround: ( index, size ) ->
    current_row = index.row
    current_col = index.col
    bounds = @getBoundSize()
    max_row = bounds.rows
    max_col = bounds.cols
    triangle = @getTriangleWithIndex( index )
    trunc_row = Math.floor( size.rows / 2 )
    trunc_col = Math.floor( size.cols / 2 )
    paddings = {
      top: trunc_row
      left: trunc_col
      bottom: size.rows - 1 - trunc_row
      right: size.cols - 1 - trunc_col
    }

    res = {
      triangles: []
      index: null
    }
    
    size_fits = false
     
    while current_row >= paddings.left and
      current_col >= paddings.top and
        current_row <= ( max_row - paddings.bottom ) and
          current_col <= ( max_col - paddings.right ) and
            !size_fits
      size_fits = false
      if !triangle.isWhite()
        current_row += @direction[ 0 ][ 0 ]
        current_col += @direction[ 0 ][ 1 ]
        triangle = @getTriangleWithIndex( { row: current_row, col: current_col } )
        continue
      else
        res.triangles = []
        res.index = { row: current_row, col: current_col }
        bound_rows = [ current_row - paddings.top, current_row + paddings.bottom ]
        bound_cols = [ current_col - paddings.left, current_col + paddings.right ]
        for i in [ bound_rows[ 0 ]..bound_rows[ 1 ] ]
          for j in [ bound_cols[ 0 ]..bound_cols[ 1 ] ]
            tmp_triangle = @getTriangleWithIndex( { row: i, col: j } )
            continue if bound_rows.indexOf( i ) isnt -1 and bound_cols.indexOf( j ) isnt -1
            if tmp_triangle? and
              !tmp_triangle.isRed() and
                !tmp_triangle.isBlue()
              res.triangles.push( tmp_triangle )
            else
              size_fits = false
              break
              break
              continue
        size_fits = true
    if !size_fits
      return null
    res


  _lockTriangles: ( triangles ) ->
    [ min_row, max_row, min_col, max_col ] = [ null, null, null, null ]
    for triangle in triangles
      ix = triangle.index
      if ix.col > max_col or max_col is null
        max_col = ix.col
      else if ix.col < min_col or min_col is null
        min_col = ix.col
      if ix.row > max_row or max_row is null
        max_row = ix.row
      else if ix.row < min_row or min_row is null
        min_row = ix.row
    bound_cols = [ min_col, max_col ]
    bound_rows = [ min_row, max_row ]

    for triangle in [ triangles[ 0 ], triangles[ triangles.length - 1 ] ]
      bound_rows.push triangle.index.row
      bound_cols.push triangle.index.col
    i = 0
    for triangle in triangles
      index = triangle.index
      if ( bound_rows.indexOf( triangle.index.row ) isnt -1 ) or
        ( bound_cols.indexOf( triangle.index.col ) isnt -1 ) and
          !triangle.isBlue()
        @triangles[ index.row ][ index.col ].blue()
      else
        @triangles[ index.row ][ index.col ].red()
      ++i


  _getMassCenter: ( triangles ) ->
    return null if triangles.length is 0
    pos = { x : 0, y : 0 }
    for triangle in triangles
      center = triangle.getCenter()
      pos.x += center.x
      pos.y += center.y
    pos.x /= triangles.length
    pos.y /= triangles.length
    new Vertex( pos.x, pos.y )

  getBoundSize: () ->
    { rows: ( @triangles.length - 1 ), cols: ( @triangles[ 0 ].length - 1 ) }

  draw: ( data ) ->
    center = @getCenterTriangle()
    #this.highlightCenterTriangle()
    i = 0 # @REMOVE_ME
    _log( data )
    for host_name, host_log of data
      #return if ++i > 1 # @REMOVE_ME
      marker = new VisitMarker( host_log )
      # every marker is considered as ellipse
      # with axis dims geven
      center = @getCenterForSizeWithLock( marker.getDim() )
      if center is null
        # one more time from center
        @center_triangle = @getCenterTriangle()
        center = @getCenterForSizeWithLock( marker.getDim() )
      return if center is null # no space left
      marker.draw( @paper, center )


class HostLog
  constructor: ( data ) ->
    @host = data.host || ""
    @log_pool = []
    @visit_counter = 0
    @typed_counter = 0
    @normalized_val = 0

  appendLog: ( log ) ->
    @log_pool.push( log )
    @_calcCounters()
  
  getComplexVal: () ->
    this.visit_counter + @typed_counter

  setNormalizedVal: ( val ) ->
    this.normalized_val = val

  _calcCounters: () ->
    visit_counter = 0
    typed_counter = 0
    for log in @log_pool
      visit_counter += log.visitCount
      typed_counter += log.typedCount
    @visit_counter = visit_counter
    @typed_counter = typed_counter


main = () ->
  return if _inited
  _inited = true
  paper = initRaphael()
  loadHistory( ( data ) =>
    for data_entry in data
      continue if data_entry.isWithoutHost()
      if host_log_pool[ data_entry.host ] == undefined
        host_log_pool[ data_entry.host ] = new HostLog( { host: data_entry.host } )
      host_log_pool[ data_entry.host ].appendLog( data_entry )
    host_log_pool = updHostLogVal( host_log_pool )
    drawHistory.call( @, paper, host_log_pool )
  )

updHostLogVal = ( host_log_pool ) ->
  min_val = null
  max_val = null
  for key, host_log of host_log_pool
    val = host_log.getComplexVal()
    if min_val is null || val < min_val
      min_val = val
    if max_val is null || val > max_val
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
  r = Raphael(
    0,
    0,
    document.body.clientWidth,
    opts.raphael.height
  )
  r.customAttributes.arc = ( x0, y0, angle_from, angle_to, R ) ->
    a_from = ( 90 - angle_from ) * Math.PI / 180
    a_to = ( 90 - angle_to ) * Math.PI / 180
    x1 = x0 + R * Math.cos( a_from )
    x2 = x0 + R * Math.cos( a_to )
    y1 = y0 - R * Math.sin( a_from )
    y2 = y0 - R * Math.sin( a_to )
    long_flag = +(( angle_from == angle_to ) ? true : ( angle_to - angle_from ) > 180 )
    path = [ [ "M", x1, y1 ], [ "A", R, R, 0, long_flag, 1, x2, y2 ] ]
    { path: path }
  r
  

loadHistory = ( cb ) ->
  chrome.history.search( { text: "", maxResults: opts.history.limit }, ( data ) =>
    for data_entry in data
      history.push( new HistoryLog( data_entry ) )
    cb.call( @, history ) if typeof( cb ) == "function"
  )

drawHistory = ( paper, data, cb ) ->
  mapper = new Mapper( { paper: paper } )
  mapper.draw( data )

document.addEventListener( 'DOMContentLoaded', main, false )

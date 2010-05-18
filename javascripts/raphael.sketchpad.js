/*
 * Raphael SketchPad
 * Version 0.2
 * Copyright (c) 2010 Ian Li (http://ianli.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 *
 * Requires:
 * jQuery	http://jquery.com
 * Raphael	http://raphaeljs.com
 * JSON		http://www.json.org/js.html
 *
 * Reference:
 * http://ianli.com/sketchpad/ for Usage
 */

/**
 * We use this wrapper to control global variables.
 * The only global variable we expose is Raphael.sketchpad.
 */
(function(Raphael) {
	
	/**
	 * Function to create SketchPad object.
	 */
	Raphael.sketchpad = function(paper, options) {
		return new SketchPad(paper, options);
	}
	
	Raphael.sketchpad.VERSION = 0.2;
	
	/**
	 * The Sketchpad object.
	 */
	var SketchPad = function(paper, options) {
		// Use self to reduce confusion about this.
		var self = this;

		// The Raphael context to draw on.
		var _paper;
		if (paper.raphael && paper.raphael.constructor == Raphael.constructor) {
			_paper = paper;
		} else if (typeof paper == "string") {
			_paper = Raphael(paper, options.width || 100, options.height || 100);
		} else {
			throw "first argument must be a Raphael object, an element ID, an array with 3 elements";
		}
		
		// The Raphael SVG canvas.
		var _canvas = _paper.canvas;

		// The HTML element that contains the canvas.
		var _container = $(_canvas).parent();
		
		// The input to store SVG data.
		var _input = options.input;
		if (_input && _input[0] != "#") {
			_input = "#" + _input;
		}

		// The default pen.
		var _pen = new Pen();
		
		// Path data
		var _strokes = options.strokes;
		_strokes = (jQuery.isArray(_strokes)) ? _strokes : [];
		_redraw_strokes();
		
		// Paths that were undone.
		var _undos = [];
		
		// Public Methods
		//-----------------
		
		self.paper = function() {
			return _paper;
		};
		
		self.canvas = function() {
			return _canvas;
		};
		
		self.container = function() {
			return _container;
		};
		
		self.pen = function(value) {
			if (value === undefined) {
				return _pen;
			}
			_pen = value;
			return self;
		};
		
		self.json = function(value) {
			if (value === undefined) {
				return JSON.stringify(_strokes);
			}
			function set_strokes(value) {
				_strokes = value;
				_redraw_strokes();
			}
			eval("set_strokes(" + value + ")");
			return self;
		};
		
		self.strokes = function(value) {
			if (value === undefined) {
				return _strokes;
			}
			if (jQuery.isArray(_strokes)) {
				_strokes = value;
				_redraw_strokes();
				_fire_change();
			}
			return self;
		}
		
		self.undoable = function() {
			return _strokes.length > 0;
		};

		self.undo = function() {
			var path = _strokes.pop();
			if (path) {
				_undos.push(path);
				_redraw_strokes();
				_fire_change();
			}
			return self;
		};

		self.redoable = function() {
			return _undos.length > 0;
		};

		self.redo = function() {
			if (_undos.length > 0) {
				var path = _undos.pop();
				_strokes.push(path);
				_redraw_strokes();
				_fire_change();
			}
			return self;
		};
		
		self.clear = function() {
			_strokes = [];
			_redraw_strokes();
			_fire_change();
			return self;
		};
		
		self.animate = function(ms) {
			if (ms === undefined) {
				ms = 500;
			}
			
			_paper.clear();
			
			if (_strokes.length > 0) {
				var i = 0;

				function animate() {
					var stroke = _strokes[i];
					var type = stroke.type;
					_paper[type]().attr(stroke);

					i++;
					if (i < _strokes.length) {
						setTimeout(animate, ms);
					}
				};

				animate();
			}
		};
		
		// Change events
		//----------------
		
		var _change_fn = function() {};
		self.change = function(fn) {
			if (fn == null || fn === undefined) {
				_change_fn = function() {};
			} else if (typeof fn == "function") {
				_change_fn = fn;
			}
		};
		
		function _fire_change() {
			_change_fn();
		};
		
		// Private methods
		//------------------
		
		function _redraw_strokes() {
			_paper.clear();
			
			for (var i = 0, n = _strokes.length; i < n; i++) {
				var p = _strokes[i];
				var type = p.type;
				_paper[type]().attr(p);
			}
			
			$(_input).val(JSON.stringify(_strokes));
		};
		
		function _disable_user_select() {
			$("*").css("-webkit-user-select", "none");
			$("*").css("-moz-user-select", "none");
			if (jQuery.browser.msie) {
				$("body").attr("onselectstart", "return false;");
			}
		}
		
		function _enable_user_select() {
			$("*").css("-webkit-user-select", "text");
			$("*").css("-moz-user-select", "text");
			if (jQuery.browser.msie) {
				$("body").removeAttr("onselectstart");
			}
		}
		
		// Event handlers
		//-----------------
		// We can only attach events to the container, so do it.
		
		function _mousedown(e) {
			_disable_user_select();
			
			_undos = [];

			_pen.start(e, self);
		};

		function _mousemove(e) {
			_pen.move(e, self);
		};

		function _mouseup(e) {
			_enable_user_select();
			
			var path = _pen.finish(e, self);
			
			if (path != null) {
				_strokes.push(path);
				
				$(_input).val(JSON.stringify(_strokes));
				
				_fire_change();
			}
		};
		
		function _touchstart(e) {
			e = e.originalEvent;
			e.preventDefault();

			if (e.touches.length == 1) {
				var touch = e.touches[0];
				_mousedown(touch);
			}
		}
		
		function _touchmove(e) {
			e = e.originalEvent;
			e.preventDefault();

			if (e.touches.length == 1) {
				var touch = e.touches[0];
				_mousemove(touch);
			}
		}
		
		function _touchend(e) {
			e = e.originalEvent;
			e.preventDefault();

			_mouseup(e);
		}
		
		
		self.editing = function(mode) {
			if (mode) {
				// Cursor is crosshair, so it looks like we can do something.
				$(_container).attr("style", "cursor:crosshair");

				$(_container).mousedown(_mousedown);
				$(_container).mousemove(_mousemove);
				$(_container).mouseup(_mouseup);

				// Handle the case when the mouse is released outside the canvas.
				$(document).mouseup(_mouseup);
				
				// iPhone Events
				var agent = navigator.userAgent;
				if (agent.indexOf("iPhone") > 0 || agent.indexOf("iPod") > 0) {
					$(_container).bind("touchstart", _touchstart);
					$(_container).bind("touchmove", _touchmove);
					$(_container).bind("touchend", _touchend);
				}
			} else {
				// Reverse the settings above.
				$(_container).attr("style", "cursor:default");
				$(_container).unbind("mousedown", _mousedown);
				$(_container).unbind("mousemove", _mousemove);
				$(_container).unbind("mouseup", _mouseup);
				$(document).unbind("mouseup", _mouseup);
				
				// iPhone Events
				var agent = navigator.userAgent;
				if (agent.indexOf("iPhone") > 0 || agent.indexOf("iPod") > 0) {
					$(_container).unbind("touchstart", _touchstart);
					$(_container).unbind("touchmove", _touchmove);
					$(_container).unbind("touchend", _touchend);
				}
			}
		}
		
		// If input is valid, then sketchpad is for input--listen to events.
		self.editing($(_input).length > 0);
	};
	
	/**
	 * The default Pen object.
	 */
	var Pen = function() {
		var self = this;

		var _color = "#000000";
		var _opacity = 1.0;
		var _width = 5;

		// Drawing state
		var _drawing = false;
		var _c = null;
		var _points = [];

		self.color = function(value) {
			if (value === undefined){
		      	return _color;
		    }

			_color = value;

			return self;
		};

		self.width = function(value) {
			if (value === undefined) {
				return _width;
			} 

			if (value < Pen.MIN_WIDTH) {
				value = Pen.MIN_WIDTH;
			} else if (value > Pen.MAX_WIDTH) {
				value = Pen.MAX_WIDTH;
			}

			_width = value;

			return self;
		}

		self.opacity = function(value) {
			if (value === undefined) {
				return _opacity;
			} 

			if (value < 0) {
				value = 0;
			} else if (value > 1) {
				value = 1;
			}

			_opacity = value;

			return self;
		}

		self.start = function(e, sketchpad) {
			_drawing = true;

			var offset = $(sketchpad.canvas()).offset();			
			_points.push([e.pageX - offset.left, e.pageY - offset.top]);

			_c = sketchpad.paper().path();

			_c.attr({ 
				stroke: _color,
				"stroke-opacity": _opacity,
				"stroke-width": _width,
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			});
		};

		self.finish = function(e, sketchpad) {
			return self.stop();
		};

		self.move = function(e, sketchpad) {
			if (_drawing == true) {
				var offset = $(sketchpad.canvas()).offset();			
				_points.push([e.pageX - offset.left, e.pageY - offset.top]);

				_c.attr({ path: points_to_svg() });
			}
		};

		self.stop = function() {
			var path = null;
			
			if (_c != null) {
				if (_points.length <= 1) {
					_c.remove();
				} else {
					path = _c.attr();
					path.type = "path";
				}
			}
			
			_drawing = false;
			_c = null;
			_points = [];
			
			return path;
		};

		function points_to_svg() {
			if (_points != null && _points.length > 1) {
				var p = _points[0];
				var path = "M" + p[0] + "," + p[1];
				for (var i = 1, n = _points.length; i < n; i++) {
					p = _points[i];
					path += "L" + p[0] + "," + p[1]; 
				} 
				return path;
			} else {
				return "";
			}
		};
	};
	
	Pen.MAX_WIDTH = 20;
	Pen.MIN_WIDTH = 1;
	
	/**
	 * Utility to generate string representation of an object.
	 */
	function inspect(obj) {
		var str = "";
		for (var i in obj) {
			str += i + "=" + obj[i] + "\n";
		}
		return str;
	}
	
})(window.Raphael);

Raphael.fn.display = function(elements) {
	for (var i = 0, n = elements.length; i < n; i++) {
		var e = elements[i];
		var type = e.type;
		this[type]().attr(e);
	}
};
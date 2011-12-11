;if(typeof(Function.prototype.bind) !== "function") {
	Function.prototype.bind = function(thisObj) { 
		var fn = this;
		var args = Array.prototype.slice.call(arguments, 1); 
		return function() { 
			return fn.apply(thisObj, args.concat(Array.prototype.slice.call(arguments))); 
		}
	}
}

(function(window, $) {

	var Tooltip = function( ele , options ){
      this.$element = $( ele );
      this.element = this.$element.get(0);
      this.options = $.extend( {} , this.defaults , options );

		var attrs = ["source", "value", "trigger", "offset", "orientation", "fade"];
		for(var i=0;i<attrs.length;i++) {
			var attr = attrs[i],
				elementAttr = this.element.getAttribute('data-tooltip-' + attr);

			if(elementAttr) { this.options[attr] = elementAttr};
		}

		this.options.fadeTime = (typeof this.options.fade === "number" ? this.options.fade : 150);

		this._init();
	};

	Tooltip.prototype._callback = function(callback) {
		var callback = arguments[0];
		if(typeof this.options[callback] == "function") {		
			var args = ([this]).concat(Array.prototype.slice.call(arguments, 1));
			this.options[callback].apply(this, args);
		}
	}
	
	Tooltip.prototype.defaults = {
		timeout: 1000/3,
		orientation: 'n', // n, e, s, w, or sw,se ... etc
		autoOrientation: true,
		trigger: 'focus', // focus, hover, toggle, manual
		html: false,
		fade: false,
		source: 'attr', // text, attr, element, remote, function
		value: 'title', // text => 'text'; attr => 'attributeName', element => 'selector || jQ object', remote => 'url', function => func() {}
		lazyLoad: false, // It will build DOM when tooltip is invoke first time
		offset: 0, // Offset in pixels of tooltip from element
		showArrow:true, // Show tooltip arrow to element
		keepInDom:false,  // Detach and append to dom every hide/show (usefull when you have lot of elements with tooltip)
		showLoader:false,
		showSpinner:false
	}

	Tooltip.prototype._init = function(){
		this._domReady = false;
		this._loaded = false;
		this._opened = false;
		this.dom = {};
		this._buildDom();
		
		if(!this.options.lazyLoad) {this._loadContent();}
		
		if(this.options.trigger != "manual") {
			var showFn = this.show.bind(this),
					hideFn = this.hide.bind(this);

			switch(this.options.trigger) {
				case "focus":
					this.$element
						.bind('focusin.tooltip.focus', showFn)
						.bind('focusout.tooltip.focus', hideFn);

					break;
				case "hover":
					this.$element
						.bind('mouseenter.tooltip.hover', showFn)
						.bind('mouseleave.tooltip.hover', hideFn);

					break;
				case "toggle":
					
					this.$element
						.bind('click.tooltip.toggle', this._elementClick.bind(this))

					break;
			}
		}

		this._callback("afterInit");
	}

	Tooltip.prototype._buildDom = function() {
		this.dom.holder = $('<div class="tooltip">');
		this.dom.content = $('<div class="tooltip-content">');
		this.dom.doc = $(document);
		
		this.dom.holder.append(this.dom.content);

		if(this.options.showArrow) {
			this.dom.arrow = $('<div class="tooltip-arrow">');
			this.dom.holder.append(this.dom.arrow);
		}

		if(this.options.keepInDom) {
			this.dom.holder.css('display', 'none');
			this.dom.holder.appendTo(document.body);
		}
		
		if(this.options.trigger == "hover") {
			this.dom.holder
				.bind('mouseenter.tooltip', this._stopHiding.bind(this))
				.bind('mouseleave.tooltip', this.hide.bind(this))
		}
		
		if(this.options.showSpinner) {
			this._buildSpinner();
		}
		
		this._domReady = true;
	};
	
	Tooltip.prototype._buildSpinner = function() {
		this._spinner = new Spinner({
		  lines: 10, // The number of lines to draw
		  length: 8, // The length of each line
		  width: 2, // The line thickness
		  radius: 6, // The radius of the inner circle
		  color: '#AAA', // #rgb or #rrggbb
		  speed: 1, // Rounds per second
		  trail: 80, // Afterglow percentage
		  shadow: false // Whether to render a shadow
		}).spin();
	}
	
	Tooltip.prototype._startSpinner = function() {
		if(parseInt(this.dom.content.css('height')) == 0) {
			this.dom.content.css({width: '150px', height: '150px'});
		}
		
		this._spinner.spin(this.dom.content[0]);
		$(this._spinner.el).css({left: parseInt(this.dom.content.css('width')) / 2, top: parseInt(this.dom.content.css('height')) / 2});
	}
	
	Tooltip.prototype._stopSpinner = function() {
		this._spinner.stop();
	}

	// Toggle trigger
	Tooltip.prototype._elementClick = function(e) {
		var self = this;
		
		this._closeTooltipOnClick = true;
		
		clearTimeout(this._bindingEventForToggle);
		
		if(this.isOpen()) {
			this._hide();
			this._unbindForToogle();
		} else {
			this._show();
			this._bindingEventsForToggle = setTimeout(function() {
				self.dom.holder
					.bind('mouseenter.tooltip.toggle', function() {self._closeTooltipOnClick = false;})
					.bind('mouseleave.tooltip.toggle', function() {self._closeTooltipOnClick = true;});

				self.dom.doc.bind('click.tooltip.toggle', self._docToggleClick.bind(self));
			}, 25);
		}
		e.preventDefault();
	}

	Tooltip.prototype._unbindForToogle = function() {
		this.dom.holder.unbind('.tooltip.toggle');
		this.dom.doc.unbind('.tooltip.toggle')		
	}
	
	Tooltip.prototype._docToggleClick = function() {
		if(this._closeTooltipOnClick) {
			this._unbindForToogle();
			this._hide();
		}
	}
	// End toggle trigger
	
	Tooltip.prototype.show = function() {
		this._stopHiding();
		
		if(!this.isOpen()) {
			if(this.options.trigger == "hover" && this.options.timeout > 0) {
				if(this._hiding) {
					clearTimeout(this._showing);
					this._show();
				} else {
					this._showing = setTimeout(this._show.bind(this), this.options.timeout);
				}
			} else {
				this._show();
			}
		}
	}
	
	Tooltip.prototype.hide = function() {
		if(this.options.trigger == "hover") {
			if(this._showing) {
				clearTimeout(this._showing);
				this._hide();
			} else {
				var timeout = this.options.timeout > 25 ? this.options.timeout : 25;
				this._hiding = setTimeout(this._hide.bind(this), this.options.timeout);
			}
		} else {
			this._hide();
		}
		if(this.options.trigger == "toggle") {
			this._unbindForToogle();
		}
	}
	
	Tooltip.prototype._show = function() {
		this._callback("beforeShow");

		var animated = this.dom.holder.is(':animated');
		
		if(!this._loaded) {this._loadContent();};

		if(this._opened) {return;};

		if(!animated) {this.dom.holder.css({top: 0, left: 0, visibility: 'hidden', display: 'block'});}
		
		if(!this.options.keepInDom) {
			this.dom.holder.appendTo(document.body);
		}

		this.position();
	
		if (this.options.fade) {
			if(!animated) {this.dom.holder.css({opacity: 0, display: 'block', visibility: 'visible'})	;}
			this.dom.holder.stop().animate({opacity: 1}, this.options.fadeTime);
		} else {
			this.dom.holder.css({visibility: 'visible'});
		}
		
		$(window)
			.bind('resize.tooltip', this._resize.bind(this))
			.bind('scroll.tooltip', this._resize.bind(this));

		this._opened = true;

		if(this._showing) {this._showing = null;};
		
		this._callback("afterShow");
	}
	
	Tooltip.prototype._hide = function() {
		var self = this,
				animated = this.dom.holder.is(':animated');

		var hiding = function() {
			if(self.options.keepInDom) {
				self.dom.holder.css('display', 'none');
			} else {
				self.dom.holder.detach();
			}
		}
		
		if(this.options.fade) {
			this.dom.holder.stop().animate({opacity: 0}, this.options.fadeTime, hiding);
		} else {
			hiding();
		}

		this._opened = false;

		$(window).unbind('resize.tooltip, scroll.tooltip');
		
		if(this._hiding) {this._hiding = null;};
		this._callback("afterHide");
	}
	
	Tooltip.prototype._stopHiding = function() {
		clearTimeout(this._hiding);
	}

	Tooltip.prototype.position = function(animate) {
		var element;
		if(this.options.positionTo && (element = $(this.options.positionTo)) && element.length) {
		} else {
			element = this.$element
		}

		var pos = $.extend({}, element.offset(), {width: element[0].offsetWidth, height: element[0].offsetHeight}),
				actualWidth = this.dom.holder[0].offsetWidth,
				actualHeight = this.dom.holder[0].offsetHeight,
				orientation = this.options.orientation.charAt(0).toLowerCase(),
				orientationAdjust = this.options.orientation.charAt(1).toLowerCase(),
				possibleOrientations = ['n', 'w', 'e', 's'],
				styles, arrowStyles;

		this._currentOrientation = orientation;
		
		if(this.options.autoOrientation || orientationAdjust.length) {
			var verticalOverlap = actualWidth / 2 - pos.width / 2,
					horizontalOverlap = actualHeight / 2 - pos.height / 2;
		}

		if(this.options.autoOrientation) {
			var $window = $(window),
					scrollTop = $window.scrollTop(),
					scrollLeft = $window.scrollLeft(),
					windowHeight = $window.height(),
					windowWidth = $window.width(),
					offset = this.options.offset,
					spaceMap = {n:{},e:{},s:{},w:{}},
					oppositeOrientation = ({'n': 's', 's': 'n', 'w': 'e', 'e': 'w'})[orientation],
					changeOrientation = false;
					
			spaceMap.n.visible = pos.top - offset - scrollTop;
			spaceMap.n.total = pos.top - offset;

			spaceMap.e.visible = windowWidth - (pos.left + pos.width + offset) + scrollLeft;
			// spaceMap.e.total = $(document).width() + 9999;
			
			spaceMap.s.visible = windowHeight - (pos.top + pos.height + offset) + scrollTop;
			// spaceMap.s.total = $(document).height() + 9999;
			
			spaceMap.w.visible = pos.left - offset - scrollLeft;
			spaceMap.w.total = pos.left - offset;
			
			if((this.isVerticalyOriented() ? actualHeight : actualWidth) > spaceMap[this._currentOrientation].visible) {
				if(this._currentOrientation == "n" || this._currentOrientation == "w") {
					if( (this.isVerticalyOriented() ? actualHeight : actualWidth) > spaceMap[this._currentOrientation].total || 
							(this.isVerticalyOriented() ? actualHeight : actualWidth) < spaceMap[oppositeOrientation].visible) {
						this._currentOrientation = oppositeOrientation
					}
				} else {
					if((this.isVerticalyOriented() ? actualHeight : actualWidth) < spaceMap[oppositeOrientation].visible) {
						this._currentOrientation = oppositeOrientation;
					}
				}
			}

			if(this.isVerticalyOriented()) {
				if(spaceMap['w'].visible < verticalOverlap) {
					orientationAdjust = 'e'
				} else if(spaceMap['e'].visible < verticalOverlap) {
					orientationAdjust = 'w'
				}
			} else {
				if(spaceMap['n'].visible < horizontalOverlap) {
					orientationAdjust = 's'
				} else if(spaceMap['s'].visible < horizontalOverlap) {
					orientationAdjust = 'n'
				}
			}			
		}
		
		for(var i=0; i < possibleOrientations.length; i++) {
			this.dom.holder.removeClass('tooltip-orientation-' + possibleOrientations[i]);
		}
		this.dom.holder.addClass('tooltip-orientation-' + this._currentOrientation);
		
		switch (this._currentOrientation) {
			case 's':
			styles = {
				'padding-top': this.options.offset,
				'padding-right': 0,
				'padding-bottom': 0,
				'padding-left': 0,
				top: pos.top + pos.height, 
				left: pos.left + pos.width / 2 - actualWidth / 2
			};
			break;
			case 'n':
			styles = {
				'padding-top': 0,
				'padding-right': 0,
				'padding-bottom': this.options.offset,
				'padding-left': 0,
				top: pos.top - actualHeight, 
				left: pos.left + pos.width / 2 - actualWidth / 2};
			break;
			case 'w':
			styles = {
				'padding-top': 0,
				'padding-right': this.options.offset,
				'padding-bottom': 0,
				'padding-left': 0,
				top: pos.top + pos.height / 2 - actualHeight / 2, 
				left: pos.left - actualWidth
			};
			break;
			case 'e':
			styles = {
				'padding-top': 0,
				'padding-right': 0,
				'padding-bottom': 0,
				'padding-left': this.options.offset,
				top: pos.top + pos.height / 2 - actualHeight / 2, 
				left: pos.left + pos.width
			};
			break;
		}

		if(this.options.showArrow) {
			arrowStyles = {};
			if(this._currentOrientation == "s" || this._currentOrientation == "n") {
				arrowStyles.left = (actualWidth / 2 - this.dom.arrow.width() / 2);
				if(this._currentOrientation == "s") {
					arrowStyles.top = this.options.offset;
					arrowStyles.bottom = 'auto';
				} else {
					arrowStyles.top = 'auto';
					arrowStyles.bottom = this.options.offset;
				}
			} else {
				arrowStyles.top = (actualHeight / 2 - this.dom.arrow.height() / 2);
				if(this._currentOrientation == "w") {
					arrowStyles.left = 'auto';
					arrowStyles.right = this.options.offset;
				} else {
					arrowStyles.left = this.options.offset;
					arrowStyles.right = 'auto';
				}
			}
		}
		
		if(orientationAdjust.length) {
			if(this.isVerticalyOriented()) {
				if(orientationAdjust == "w") {
					styles['left'] = styles['left'] - verticalOverlap;
					arrowStyles['left'] = arrowStyles['left'] + verticalOverlap
				} else {
					styles['left'] = styles['left'] + verticalOverlap;
					arrowStyles['left'] = arrowStyles['left'] - verticalOverlap
				}
			} else {
				if(orientationAdjust == "n") {
					styles['top'] = styles['top'] - horizontalOverlap;
					arrowStyles['top'] = arrowStyles['top'] + horizontalOverlap
				} else {
					styles['top'] = styles['top'] + horizontalOverlap;	
					arrowStyles['top'] = arrowStyles['top'] - horizontalOverlap
				}
			}
		}
		
		this.dom.holder.css(styles);
		if(this.options.showArrow) {
			this.dom.arrow.css(arrowStyles);
		}
		
	}

	Tooltip.prototype._loadContent = function() {
		var self = this;
		
		if(this.options.showSpinner) {
			this._startSpinner();
		}
		
		switch(this.options.source) {
			case 'text':
				this._processContent(this.options.value);

				break;				
			case 'attr':
				this._processContent(this.$element.attr(this.options.value));

				break;
			case 'element':
				var contentElement;

				if(typeof(this.options.value) == "string")
					contentElement = $(this.options.value);
				else if(typeof(this.options.value) == "object") {
					contentElement = this.options.value;
				}

				this._processContent(contentElement.detach())

				break;
			case 'remote':
				if(this._xhr) {this._xhr.abort();}
				this._xhr = $.ajax({
					url: this.options.value,
					method: 'get',
					success: this._processContent.bind(this),
					dataType: 'html',
					cache: true
				});

				break;
			case 'function':
				this.options.value(this, this._processContent.bind(this));

				break;
		}
	}
	
	Tooltip.prototype._processContent = function(content) {
		this.content = content;

		if(this.options.showSpinner) {
			this._stopSpinner();
		}
		
		this.dom.content.empty();
		
		if(this.options.source == "element" || this.options.source == "remote") {
			this.dom.content.html(this.content);
		} else if(typeof this.content == "string" && this.content.length) {
			this.dom.content[this.options.html ? "html" : "text"](this.content);
		} else {
			this.dom.content.text('error')
		}
		
		this.dom.content.css({
			width: 'auto',
			height: 'auto'
		});

		this._loaded = true;
		
		if(this.isOpen) {
			this.position();
		}

		this._callback("afterContentLoaded");
	}
	
	Tooltip.prototype.setOptions = function(options) {
		var oldOptions = this.options;

		this.options = $.extend( {}, this.options , options );
		
		if(oldOptions.source != this.options.source || oldOptions.value != this.options.value) {
			this._loaded = false;
			this.content = null;
			this.dom.content
				.css({
					width: this.dom.content.width(),
					height: this.dom.content.height()
				})
				.empty();

			if(this.isOpen || (!this.isOpen && !this.options.lazyLoad)) {
				this._loadContent()
			}
		}
		
		if(oldOptions.positionTo != this.options.positionTo || oldOptions.offset != this.options.offset) {
			if(this.isOpen()) {
				this.position();
			}
		}
	}
	
	Tooltip.prototype.destroy = function() {
		this._callback("beforeDestroy")
		
		this.$element.unbind('.tooltip');
		this.dom.holder.unbind('.tooltip');
		$(window).unbind('resize.tooltip');
		this.dom.holder.remove();
		$.removeData(this.element, 'tooltip');
	}
	
	Tooltip.prototype.isVerticalyOriented = function() {
		if(this._currentOrientation == "n" || this._currentOrientation == "s") {
			return true;
		} else {
			return false;			
		}
	}
	
	Tooltip.prototype.isOpen = function() {
		return this._opened;
	}
	
	Tooltip.prototype._resize = function() {
		var self = this;
		clearTimeout(this._resizing);
		this._resizing = setTimeout(function() {
			self.position();
		}, 100);
	}
	
	$.registerPlugin("tooltip", Tooltip)
	window.Tooltip = Tooltip;

})(window, jQuery);
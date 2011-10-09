if(typeof(Function.prototype.bind) !== "function") {
	Function.prototype.bind = function(thisObj) { 
		var fn = this;
		var args = Array.prototype.slice.call(arguments, 1); 
		return function() { 
			return fn.apply(thisObj, args.concat(Array.prototype.slice.call(arguments))); 
		}
	}
}

(function(window, $) {
	Tooltip = function(element, options) {
		
		var defaults = {
			live: false,
			orientation: 'n', // n, e, s, w 
			trigger: 'focus', // focus, hover, toggle, manual
			html: false,
			source: 'attr', // text, attr, element, remote, function
			value: 'title', // text => 'text'; attr => 'attributeName', element => 'selector || jQ object', remote => 'url', function => func() {}
			lazyLoad: false, // It will build DOM when tooltip is invoke first time
			reload: false, // Reload content every time when showing tooltip
			offset: 0, // Offset in pixels of tooltip from element
			showArrow:true, // Show tooltip arrow to element
			keepInDom:false  // Detach and append to dom every hide/show (usefull when you have lot of elements with tooltip)
		}
		
		this.options = options = jQuery.extend(defaults, options);
		
		this.dom = {
			element: $(element)
		}
				
		this.content = null;
		this.opened = false;
		this.loaded = false;
		
		if(!this.options.reload && !this.options.lazyLoad) {
			this.load();
		}
		
		if(this.options.trigger != "manual") {
			var bindFunction = this.dom.element[this.options.live ? "live" : "bind"],
					showFn = this.show.bind(this),
					hideFn = this.hide.bind(this);
			
			switch(this.options.trigger) {
				case "focus":
					this.dom.element
						.bind('focusin', showFn)
						.bind('focusout', hideFn);
						
					break;
				case "hover":
					this.dom.element.hover(showFn, hideFn);

					break;
				case "toggle":
					this.dom.element.toggle(showFn, hideFn)

					break;
			}
		}
	}
	
	Tooltip.prototype.buildDom = function() {
		if(!this.dom.holder) {
			this.dom.content = $('<div class="tooltip-content">');
			this.dom.holder = $('<div class="tooltip">');

			if(this.options.showArrow) {
				this.dom.arrow = $('<div class="tooltip-arrow">');
				this.dom.holder.append(this.dom.arrow);
			}
		
			this.dom.holder
				.addClass('tooltip-orientantion-' + this.options.orientation)
				.append(this.dom.content)
		
			if(this.options.keepInDom) {
				this.hide();
				this.dom.holder.appendTo(document.body);
			}
		
			this.callback("afterBuildDom");
		}
	}
	
	Tooltip.prototype.callback = function(callback) {
		if(typeof this.options[callback] == "function") {
			this.options[callback](this);
		}
	}

	Tooltip.prototype.show = function() {
		if(this.options.reload || (this.options.lazyLoad && !this.loaded)) {
			// this.dom.holder.empty()
			this.load();
		}
		this.position();
		
		this.callback("afterShow");
	}

	Tooltip.prototype.hide = function() {
		if(!this.options.keepInDom) {
			this.dom.holder.remove();
		} else {
			this.dom.holder.hide()
		}		

		this.opened = false;
		
		this.callback("afterHide");
	}
	
	Tooltip.prototype.position = function() {
		if(!this.opened) {
			
      this.dom.holder.css({top: 0, left: 0, visibility: 'hidden', display: 'block'});
			if(!this.options.keepInDom) {
				this.dom.holder.appendTo(document.body);
			}

      var pos = $.extend({}, this.dom.element.offset(), {
          width: this.dom.element[0].offsetWidth,
          height: this.dom.element[0].offsetHeight
      });
      
      var actualWidth = this.dom.holder[0].offsetWidth, 
					actualHeight = this.dom.holder[0].offsetHeight;

			var styles, orientation = this.options.orientation.charAt(0);
      switch (orientation.charAt(0)) {
          case 's':
              styles = {top: pos.top + pos.height + this.options.offset, left: pos.left + pos.width / 2 - actualWidth / 2};
              break;
          case 'n':
              styles = {top: pos.top - actualHeight - this.options.offset, left: pos.left + pos.width / 2 - actualWidth / 2};
              break;
          case 'w':
              styles = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth - this.options.offset};
              break;
          case 'e':
              styles = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width + this.options.offset};
              break;
      }

      this.dom.holder.css(styles);

			if(this.options.showArrow) {
				if(orientation == "s" || orientation == "n") {
					this.dom.arrow.css('left', actualWidth / 2 - this.dom.arrow.width() / 2).css({s:'top', n:'bottom'}[orientation], 0);
				} else {
					this.dom.arrow.css('top', actualHeight / 2 - this.dom.arrow.height() / 2).css({e:'left', w:'right'}[orientation], 0);
				}
			}
			// TODO animation hide/show
      // if (this.options.fade) {
          // $tip.stop().css({opacity: 0, display: 'block', visibility: 'visible'}).animate({opacity: this.options.opacity});
      // } else {
			this.dom.holder.css({visibility: 'visible'});
      // }

			this.opened = true;
		}
	}
	
	Tooltip.prototype.load = function() {
			// TODO zobrazit loader
		switch(this.options.source) {
			case 'text':
				this.processContent(this.options.value);

				break;				
			case 'attr':
				this.processContent(this.dom.element.attr(this.options.value));

				break;
			case 'element':
				var contentElement;

				if(typeof(this.options.value) == "string")
					contentElement = $(this.options.value);
				else if(typeof(this.options.value) == object) {
					contentElement = this.options.value;
				}

				this.processContent(contentElement.html())
				
				break;
			case 'remote':
				if(this.xhr) {this.xhr.abort();}
				this.xhr = $.get(this.options.value, this.processContent.bind(this));
				
				break;
			case 'function':
				this.options.value(this.processContent.bind(this));
				
				break;
		}
	}
	
	Tooltip.prototype.processContent = function(content) {

		this.content = content;

		this.callback("afterContentLoaded");
		
		this.buildDom();
		
		if(typeof this.content == "string" && this.content.length) {
			this.dom.content[this.options.html ? "html" : "text"](this.content);
		} else {
			this.dom.content.text('error')
			// TODO Fallback
		}
		this.loaded = true;
	}

	$.fn.tooltip = function(options) {
		var el;
		this.each(function() {
			el = $(this);
			if(!$.data(el, 'tooltip')) {
				$.data(el, 'tooltip', new Tooltip(this, options))
			}
		})

		return this;
	}

})(window, jQuery)
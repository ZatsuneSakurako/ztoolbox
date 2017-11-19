/**
 * Tooltip.js
 * A basic script that applies a mouseover tooltip functionality to all elements of a page that have a data-tooltip attribute
 * Matthias Schuetz, http://matthiasschuetz.com
 *
 * Copyright (C) Matthias Schuetz
 * Free to use under the MIT license
 */

(function (root, factory) {
	if (typeof define === "function" && define.amd) {
		// AMD. Register as an anonymous module.
		define(factory);
	} else if (!root.tooltip) {
		// Browser globals
		root.tooltip = factory(root);
	}
}(this, function() {
	let options = {
		tooltipId: "tooltip",
		offsetDefault: 15
	},
		_tooltips = [],
		_tooltipsTemp = null,
		currentTooltip = null
	;

	function _bindTooltips(resetTooltips) {
		if (resetTooltips) {
			_tooltipsTemp = _tooltips.concat();
			_tooltips = [];
		}

		Array.prototype.forEach.call(document.querySelectorAll("[data-tooltip-text]"), function(elm, idx) {
			let tooltipText = elm.dataset.tooltipText.trim();

			if (resetTooltips && _tooltipsTemp.length && _tooltipsTemp.hasOwnProperty(idx)) {
				if(_tooltipsTemp[idx].hasOwnProperty("oldTitle")) {
					elm.title = _tooltipsTemp[idx].oldTitle;
				}

				elm.removeEventListener("mousemove", _onElementMouseMove);
				elm.removeEventListener("mouseout", _onElementMouseOut);
				elm.removeEventListener("mouseover", _onElementMouseOver);
			}

			if (tooltipText) {
				elm.dataset.tooltipText = tooltipText;
				elm.dataset.tooltipId = idx;
				let parsedOptions = {};
				if(elm.dataset.hasOwnProperty("tooltip") && elm.dataset.tooltip!==""){
					try {
						parsedOptions = JSON.parse(elm.dataset.tooltip.replace(/'/ig, "\""));
					} catch(err) {
						console.log(err);
					}
				}
				_tooltips[idx] = {
					"options": parsedOptions
				};
				if(elm.title!==""){
					_tooltips[idx].oldTitle = elm.title;
					elm.removeAttribute("title");
				}

				elm.addEventListener("mousemove", _onElementMouseMove);
				elm.addEventListener("mouseout", _onElementMouseOut);
				elm.addEventListener("mouseover", _onElementMouseOver);
			}
		});

		if(resetTooltips){
			_tooltipsTemp = null;
		}
	}

	function _getTooltipElm() {
		return (currentTooltip!==null)? document.querySelector("#" + currentTooltip.tooltipId) : null;
	}

	function _onElementMouseMove(evt) {
		let tooltipId = this.dataset.tooltipId;
		let tooltipElm = _getTooltipElm();
		let tooltipOptions = tooltipId && _tooltips[tooltipId] && _tooltips[tooltipId].options;
		let offset = tooltipOptions && tooltipOptions.offset || options.offsetDefault;
		let scrollY = window.scrollY || window.pageYOffset;
		let scrollX = window.scrollX || window.pageXOffset;
		let tooltipTop = evt.pageY + offset;
		let tooltipLeft = evt.pageX + offset;

		if (tooltipElm) {
			tooltipTop = (tooltipTop - scrollY + tooltipElm.offsetHeight + 20 >= window.innerHeight ? (tooltipTop - tooltipElm.offsetHeight - 20) : tooltipTop);
			tooltipLeft = (tooltipLeft - scrollX + tooltipElm.offsetWidth + 20 >= window.innerWidth ? (tooltipLeft - tooltipElm.offsetWidth - 20) : tooltipLeft);

			tooltipElm.style.top = tooltipTop + "px";
			tooltipElm.style.left = tooltipLeft + "px";
		}
	}

	function _onElementMouseOut() {
		let tooltipElm = _getTooltipElm();

		if (tooltipElm) {
			tooltipElm.remove();
			currentTooltip = null;
		}
	}

	function _onElementMouseOver() {
		let tooltipId = this.dataset.tooltipId;

		if(this.dataset.hasOwnProperty("tooltipText")){
			let tooltipElm = document.createElement("div");
			let tooltipOptions = tooltipId && _tooltips[tooltipId] && _tooltips[tooltipId].options;

			if (tooltipOptions && tooltipOptions["class"]) {
				tooltipElm.className = tooltipOptions["class"];
			}

			currentTooltip = {
				"source": this
			};

			tooltipElm.id = currentTooltip.tooltipId = tooltipOptions.tooltipId || options.tooltipId;

			tooltipElm.textContent = this.dataset.tooltipText;

			document.querySelector("body").appendChild(tooltipElm);
		}
	}

	function _init() {
		window.addEventListener("load", _bindTooltips);
	}

	_init();

	return {
		setOptions: function(tooltipOptions) {
			for(let option in tooltipOptions) {
				if(tooltipOptions.hasOwnProperty(option) && options.hasOwnProperty(option)) {
					options[option] = options[option];
				}
			}
		},
		refresh: function() {
			_bindTooltips(true);

			const elm = _getTooltipElm();
			if(elm && currentTooltip.source){
				elm.textContent = currentTooltip.source.dataset.tooltipText;
			}
		}
	};
}));

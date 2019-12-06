const {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

/*
 * Preferences support
 * From https://developer.mozilla.org/en-US/Add-ons/How_to_convert_an_overlay_extension_to_restartless
 */
function getGenericPref(branch,prefName) {
	switch (branch.getPrefType(prefName)) {
	default:
	case 0:   return undefined;                      // PREF_INVALID
	case 32:  return branch.getCharPref(prefName);  // PREF_STRING
	case 64:  return branch.getIntPref(prefName);    // PREF_INT
	case 128: return branch.getBoolPref(prefName);   // PREF_BOOL
	}
}
function setGenericPref(branch,prefName,prefValue) {
	switch (typeof prefValue) {
	case "string":
		branch.setCharPref(prefName,prefValue);
		return;
	case "number":
		branch.setIntPref(prefName,prefValue);
		return;
	case "boolean":
		branch.setBoolPref(prefName,prefValue);
		return;
	}
}
function setDefaultPref(prefName,prefValue) {
	var defaultBranch = Services.prefs.getDefaultBranch(null);
	setGenericPref(defaultBranch,prefName,prefValue);
}

/*
 * Add functionality to window document
 */
var ObservePopups = function () {};
ObservePopups.prototype = {
	observe: function(subject, topic, data) {
		var wnd = subject.QueryInterface(Components.interfaces.nsIDOMWindow);
		wnd.addEventListener("DOMContentLoaded", function (event) {
			// XXX Check that this document qualifies, and return immediately if not.
			var doc = event.target;
			var winID = doc.documentElement.getAttribute('windowtype');
			if (winID != 'zotero:item-selector' && winID != 'zotero:quick-item-selector') return;

			var popupSet = doc.getElementsByTagName('popupset')[0];
			if (popupSet) return;

			// (1) popupset node
			popupSet = doc.createElement('popupset');
			var lastChild = doc.childNodes[doc.childNodes.length-1];
			var firstGrandChild = lastChild.childNodes[0];
			lastChild.insertBefore(popupSet,firstGrandChild);
			
			// (2) Keyboard handler
			function showMenu (event) {
				if (event.keyCode==83 && event.ctrlKey) {
					event.preventDefault();
					// Open popup menu
					var signalsPopup = doc.getElementById('signals-popup');
					signalsPopup.openPopup(event.target, "after_start", 0, 0, false, false);
				}
			}

			// (3) Signal insert event handler
			wnd.setSignal = function(node, event) {
				var signalElem = event.target;
				var signal = signalElem.getAttribute('value');
				var fieldElem = node.parentNode.anchorNode;
				var selectionStart = fieldElem.selectionStart;
				var selectionEnd = fieldElem.selectionEnd;
				var val = fieldElem.value;
				var start = val.slice(0,selectionStart);
				var end = val.slice(selectionEnd);
				// Add spacing
				if (start.length) {
					signal = ' ' + signal
				}
				signal = signal + ' ';
				// Normalize spaces
				val = (start + signal + end).replace(/\s+/g, ' ');
				fieldElem.value = val;
			}

			// (4) Utility function to apply italics
			function italicize (str) {
				if (str.slice(-1) === ',') {
					str = '<i>' + str.slice(0,-1) + '</i>' + str.slice(-1);
				} else {
					str = '<i>' + str + '</i>';
				}
				return str;
			}

			// (4) Junk to build the menu
			var signalsPopupElem = doc.createElement('menupopup');
			signalsPopupElem.setAttribute('id','signals-popup');
			var branch = Services.prefs.getBranch('extensions.bluebook-signals.');
			var signals = JSON.parse(getGenericPref(branch, 'signals'));
			for (var i=0,ilen=signals.length;i<ilen;i+=1) {
				var menuItemElem = doc.createElement('menuitem');
				var firstChar = signals[i].slice(0,1);
				var remainderChars = signals[i].slice(1);
				var val = (firstChar.toUpperCase() + remainderChars);
				menuItemElem.setAttribute('value',italicize(val));
				menuItemElem.setAttribute('label',val);
				menuItemElem.setAttribute('oncommand','setSignal(this, event)')
				signalsPopupElem.appendChild(menuItemElem);
			}
			for (var i=0,ilen=signals.length;i<ilen;i+=1) {
				var menuItemElem = doc.createElement('menuitem');
				menuItemElem.setAttribute('value',italicize(signals[i]));
				menuItemElem.setAttribute('label',signals[i]);
				menuItemElem.setAttribute('oncommand','setSignal(this, event)')
				signalsPopupElem.appendChild(menuItemElem);
			}
			popupSet.appendChild(signalsPopupElem);

			// (5) Install the keyboard handler and hope for the best
			var fieldElem = doc.getElementById('prefix');
			fieldElem.addEventListener('keydown',showMenu);
		}, false);
	},
	register: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this, "chrome-document-global-created", false);
	},
	unregister: function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		observerService.removeObserver(this, "chrome-document-global-created");
	}
}
var observePopups = new ObservePopups();


/*
 * Bootstrap functions
 */
function startup (data, reason) {
	// Set up preferences
	Services.scriptloader.loadSubScript("chrome://bluebook-signals/content/defaultprefs.js",
										{pref:setDefaultPref} );
	//observeStartup.register();
	observePopups.register();
}

function shutdown (data, reason) {
	observePopups.unregister();
}

function install (data, reason) {}
function uninstall (data, reason) {}

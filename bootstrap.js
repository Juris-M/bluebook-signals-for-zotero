const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

const PREF_BRANCH = "extensions.zotero.integration";
const PREFS = {
    "signals":'["e.g.,","accord","see","see also","see, e.g.,","cf.","contra","but see","see generally"]'
};

function setDefaultPrefs() {
  let branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
  for (let [key, val] in Iterator(PREFS)) {
    switch (typeof val) {
      case "boolean":
        branch.setBoolPref(key, val);
        break;
      case "number":
        branch.setIntPref(key, val);
        break;
      case "string":
        branch.setCharPref(key, val);
        break;
    }
  }
}

// Travelling object that holds the windows to which a listener and command have been attached
var watchedWindows = {};

/**
 * Apply a callback to each open and new browser windows.
 *
 * @usage watchWindows(callback): Apply a callback to each browser window.
 * @param [function] callback: 1-parameter function that gets a browser window.
 */
function WindowWatcher(callback) {
    this.register();
    this.callback = callback;
}

WindowWatcher.prototype = {

    watchedWindows:{},

    observe: function(subject, topic, data) {
        // Do your stuff here.
        if (topic == "domwindowopened") {

            function installMenu (window,document) {
                var document = window.document;
                
                // Check for presence of menu
                // Install if not present
                var fieldElem = document.getElementById('prefix');

                var popupSet = document.getElementsByTagName('popupset')[0];
                if (!popupSet) {
                    popupSet = document.createElement('popupset');
                    var lastChild = document.childNodes[document.childNodes.length-1];
                    var firstGrandChild = lastChild.childNodes[0];
                    lastChild.insertBefore(popupSet,firstGrandChild);
                }
                
                var signalsPopupElem = document.createElement('menupopup');
                signalsPopupElem.setAttribute('id','signals-popup');
                var branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
                var signals = JSON.parse(branch.getCharPref('signals'));
                for (var i=0,ilen=signals.length;i<ilen;i+=1) {
                    var menuItemElem = document.createElement('menuitem');
                    var firstChar = signals[i].slice(0,1);
                    var remainderChars = signals[i].slice(1);
                    menuItemElem.setAttribute('value','<i>' + firstChar.toUpperCase() + remainderChars + '</i>');
                    menuItemElem.setAttribute('label',firstChar.toUpperCase() + remainderChars);
                    menuItemElem.setAttribute('oncommand','setSignal(this,event);')
                    signalsPopupElem.appendChild(menuItemElem);
                }
                for (var i=0,ilen=signals.length;i<ilen;i+=1) {
                    var menuItemElem = document.createElement('menuitem');
                    menuItemElem.setAttribute('value','<i>' + signals[i] + '</i>');
                    menuItemElem.setAttribute('label',signals[i]);
                    menuItemElem.setAttribute('oncommand','setSignal(this,event);')
                    signalsPopupElem.appendChild(menuItemElem);
                }
                popupSet.appendChild(signalsPopupElem);
            }

            function addFieldListener(window,document) {


                window.setSignal = function (node,event) {
                    var signalElem = event.target;
                    var fieldElem = node.parentNode.anchorNode;
                    var selectionStart = fieldElem.selectionStart;
                    var selectionEnd = fieldElem.selectionEnd;
                    var val = fieldElem.value;
                    var start = val.slice(0,selectionStart);
                    var end = val.slice(selectionEnd);
                    fieldElem.value = start + signalElem.getAttribute('value') + end;
                };

                // Open menu on hotkey
                function showMenu (event) {
                    if (event.keyCode==83 && event.ctrlKey) {
                        event.preventDefault();
                        // Open popup menu
                        var signalsPopup = document.getElementById('signals-popup');
                        signalsPopup.openPopup(event.target, "after_start", 0, 0, false, false);
                    }
                }

                installMenu(window,document);
                var fieldElem = document.getElementById('prefix');
                fieldElem.addEventListener('keydown',showMenu);
            }

            function watcher(window) {
                let {documentElement} = window.document;
                var windowType = documentElement.getAttribute("windowtype");
                if (windowType == "zotero:item-selector" || windowType == "zotero:quick-item-selector") {
                    watchedWindows[windowType] = window;
                    var fieldElem = window.document.getElementById('prefix');
                    if (!fieldElem) return;
                    addFieldListener(window,window.document);
                }
            };

            function runOnLoad() {
                watcher(subject);
            };

            subject.addEventListener("load", runOnLoad, false);
        }
    },
    register: function() {
        var observerService = Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
        observerService.addObserver(this, "windowWatcherID", false);
    },
    unregister: function() {

        fieldElem.removeEventListener('keydown',callShowMenu);

        var observerService = Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService);
        observerService.removeObserver(this, "windowWatcherID");
    }
}
var windowWatcher = new WindowWatcher;

function watchWindows(disableWatcher) {
    if (disableWatcher) {
        Services.ww.unregisterNotification(windowWatcher);
    } else {
        Services.ww.registerNotification(windowWatcher);
    }
}




/**
 * Handle the add-on being activated on install/enable
 */
function startup(data, reason) {
    // Shift all open and new browser windows
    setDefaultPrefs();
    watchWindows();
}

/**
 * Handle the add-on being deactivated on uninstall/disable
 */
function shutdown(data, reason) {
    if (reason != APP_SHUTDOWN) {
        for (key in watchedWindows) {
            try {
                var win = watchedWindows[key];
                var doc = win.document;
                // true is for removal of listener
                addFieldListener(win,doc,true);
            } catch (e) {
                dump("Bluebook Signals for Zotero: OOPS during unload: "+e+"\n");
            }
        }
    }
    // true is for removal of registered observer
    watchWindows(true);
}

/**
 * Handle the add-on being installed
 */
function install(data, reason) {}

/**
 * Handle the add-on being uninstalled
 */
function uninstall(data, reason) {};


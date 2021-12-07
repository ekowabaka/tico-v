/**
 * Instance of DomParser used for parsing views
 * @type {DomParser}
 */
let domparser = new DomParser();

/**
 * Proxy handler containing the traps for operations on Array Objects
 *
 * @param entry
 * @param manipulator
 * @constructor
 */
function ArrayUpdateHandler(entry, manipulator) {

  /**
   * Keeps a weak map cache of proxies attached to dom nodes so they die along with their attached node.
   * @type {WeakMap<Object, any>}
   */
  let proxyCache = new WeakMap();

  /**
   * Keeps a list of all the proxies created so they are not added back to the object or recreated in anyway.
   * @type {WeakMap<Object, any>}
   */
  let proxiesCreated = new WeakMap();

  /**
   * A trap for returning values from arrays or proxies of objects from the array.
   * @param target
   * @param name
   * @returns {*}
   */
  this.get = function (target, name) {
    if (typeof target[name] === 'function' || typeof target[name] !== 'object') {
      return target[name];
    }

    let node = entry.parent.children[name];
    if (!proxyCache.has(node)) {
      let proxy = new Proxy(target[name], new UpdateHandler(entry.variables, entry.manipulators, entry.parent.children[name]));
      proxyCache.set(node, proxy);
      proxiesCreated.set(proxy, target[name]);
    }
    return proxyCache.get(node);
  }

  /**
   * A trap for setting values into the array.
   * @param target
   * @param name
   * @param value
   * @returns {boolean}
   */
  this.set = function (target, name, value) {
    if (proxiesCreated.has(value)) {
      value = proxiesCreated.get(value);
    }
    target[name] = value;
    if (name === 'length') {
      for (let i = 0; i < entry.parent.children.length - value; i++) {
        entry.parent.removeChild(entry.parent.lastChild);
      }
      return true;
    }
    manipulator.set(name, target[name]);
    return true;
  }
}

/**
 * A proxy handler containing traps for other objects
 *
 * @param variables
 * @param manipulators
 * @param node
 * @constructor
 */
function UpdateHandler(variables, manipulators, node) {
  this.get = function (target, name) {
    if (typeof target[name] === 'object' && Array.isArray(target[name]) && variables.get(name)[0].type === "foreach") {
      let entry = variables.get(name)[0];
      let updateHandler = new ArrayUpdateHandler(entry, manipulators[0]);
      return new Proxy(target[name], updateHandler);
    } else if (typeof target[name] === 'object') {
      return target[name];
    } else {
      return target[name];
    }
  }

  this.set = function (target, name, value) {
    target[name] = value;
    this.run(target);
    return true;
  }

  this.run = function (target) {
    manipulators.forEach(manipulator => {
      let manipulatedNode = undefined;
      if (node) {
        let baseNode = manipulator.variables.path == "" ? node : node.querySelector(manipulator.variables.path);
        if (manipulator.variables.type == "text") {
          manipulatedNode = baseNode.childNodes[manipulator.variables.index];
        } else if (manipulator.variables.type == "attribute") {
          manipulatedNode = baseNode.getAttributeNode(manipulator.variables.name);
        } else {
          manipulatedNode = baseNode;
        }
      }
      manipulator.update(target, manipulatedNode)
    });
  }
}

function View(variables, nodes, manipulators, bindingDetails) {
  let dataProxy = new Proxy({}, new UpdateHandler(variables, manipulators));

  Object.defineProperty(this, 'data', {
    get: () => dataProxy,
    set: newData => {
      let updateHandler = new UpdateHandler(variables, manipulators);
      dataProxy = new Proxy(newData, updateHandler);
      updateHandler.run(newData);
      if (bindingDetails.onCreate && typeof bindingDetails.onCreate.$default === 'function') {
        bindingDetails.onCreate.$default(bindingDetails.templateNode);
      }
    }
  });

  const attachEvent = function(node, event, callback) {
    if(nodes.has(node) && nodes.get(node).type == "foreach") {
      nodes.get(node).events.push({name: event, callback: callback, path: undefined});
    }  
  }

  /**
   * A selector that picks items from within the template.
   * Our ultimate goal with this function is to be able to trap addEventListener calls on items within the template.
   * We are particularly interested in the event listeners that are applied to foreach items and their children.
   *
   * @param {string} selector 
   */
  this.querySelector = function (selector) {
    const node = bindingDetails.templateNode.querySelector(selector);
    // check if node has a foreach parent
  }

  /**
   * Add events directly to the template node.

   * @param {Event} event 
   * @param {CallableFunction} callback 
   */
  this.addEventListener = function (event, callback) {
    attachEvent(bindingDetails.templateNode, event, callback);
  }
}

/**
 * Bind a view to a set of variables
 */
function bind(template, bindingDetails) {
  bindingDetails = bindingDetails || {};
  bindingDetails.templateNode = typeof template === 'string' ? document.querySelector(template) : template;
  if (bindingDetails.templateNode) {
    const variables = domparser.parse(bindingDetails);
    const manipulators = DomManipulators.create(variables);
    const nodes = new Map();
    variables.forEach((value, key) => {
      value.forEach(variable => {
        nodes.set(variable.template, variable)
      });
    })
    return new View(variables, nodes, manipulators, bindingDetails);
  } else {
    throw new Error("Could not find template node");
  }
}

let tv = {
  bind: bind
}

if (typeof require === 'function') {
  module.exports = tv;
} else {
  window.tv = tv;
}

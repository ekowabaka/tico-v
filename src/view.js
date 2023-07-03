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
function ArrayUpdateHandler(entries, manipulators) {

  /**
   * Keeps a weak map cache of proxies attached to dom nodes so they die along with their attached node.
   * @type {WeakMap<Object, any>}
   */
  const proxyCache = new WeakMap();

  /**
   * Keeps a map of all the proxies created so they are not added back to the object or recreated in anyway.
   * @type {WeakMap<Object, any>}
   */
  const proxiesCreated = new WeakMap();

  const numEntries = entries.length;

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

    // Create the caches for the group of nodes based on the first entry of variables.
    let node;
    for(const entry of entries) {
      node = entry.parent.children[name];
      if (!proxyCache.has(node)) {
        const proxy = new Proxy(target[name], new UpdateHandler(entry.variables, entry.manipulators, entry.parent.children[name]));
        proxyCache.set(node, proxy);
        proxiesCreated.set(proxy, target[name]);
        break;
      }
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
    // Prevent proxies already created from being added back to the array.
    if (proxiesCreated.has(value)) {
      value = proxiesCreated.get(value);
    }
    target[name] = value;
    if (name === 'length') {
      entries.forEach(entry => {
        for (let i = 0; i < entry.parent.children.length - value; i++) {
          entry.parent.removeChild(entry.parent.lastChild);
        }  
      });
      return true;
    }
    manipulators.forEach(x => x.set(name, target[name]));
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
    // The assumption here is that variables used as foreach will not be used in any other context within the view
    if (typeof target[name] === 'object' && Array.isArray(target[name]) && variables.get(name)[0].type === "foreach") {
      //let entry = variables.get(name)[0];
      let updateHandler = new ArrayUpdateHandler(variables.get(name), manipulators);
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


class View {

  #dataProxy
  #variables
  #manipulators;
  #bindingDetails;

  constructor (variables, manipulators, bindingDetails) {
    this.#dataProxy = new Proxy({}, new UpdateHandler(variables, manipulators))
    this.#variables = variables;
    this.#manipulators = manipulators;
    this.#bindingDetails = bindingDetails;
  }

  set data(newData) {
    let updateHandler = new UpdateHandler(this.#variables, this.#manipulators);
    this.#dataProxy = new Proxy(newData, updateHandler);
    updateHandler.run(newData);
  }

  get data() {
    return this.#dataProxy;
  }

  addObserver(id, callback) {
    if(this.#bindingDetails.observers.has(id)) {
      this.#bindingDetails.observers.get(id).push(callback);
    }
  }
}

/**
 * Bind a view to a mapping of its internal variables.
 */
function bind(template) {
  const bindingDetails = {
    observers: new Map()
  };
  bindingDetails.templateNode = typeof template === 'string' ? document.querySelector(template) : template;
  if (bindingDetails.templateNode) {
    const variables = domparser.parse(bindingDetails);
    const manipulators = DomManipulators.create(variables, bindingDetails);
    // const nodes = new Map();
    // variables.forEach((value, key) => {
    //   value.forEach(variable => {
    //     nodes.set(variable.template, variable)
    //   });
    // })
    return new View(variables, manipulators, bindingDetails);
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

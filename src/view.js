/**
 * Instance of DomParser used for parsing views
 * @type {DomParser}
 */
const domparser = new DomParser();


class ArrayUpdateHandler {

  #entries
  #manipulators
  #proxyCache
  #proxiesCreated

  constructor(entries, manipulators) {
    this.#entries = entries;
    this.#manipulators = manipulators;
    this.#proxyCache = new WeakMap();
    this.#proxiesCreated = new WeakMap();
  }

  get (target, name) {
    if (typeof target[name] === 'function' || typeof target[name] !== 'object') {
      return target[name];
    }

    // Create the caches for the group of nodes based on the first entry of variables.
    let node;
    for (const entry of this.#entries) {
      node = entry.parent.children[name];
      if (!this.#proxyCache.has(node)) {
        const proxy = new Proxy(target[name], new UpdateHandler(entry.variables, entry.manipulators, entry.parent.children[name]));
        this.#proxyCache.set(node, proxy);
        this.#proxiesCreated.set(proxy, target[name]);
        break;
      }
    }
    return proxyCache.get(node);    
  }

  set (target, name, value) {
    // Prevent proxies already created from being added back to the array.
    if (this.#proxiesCreated.has(value)) {
      value = this.#proxiesCreated.get(value);
    }
    target[name] = value;
    if (name === 'length') {
      this.#entries.forEach(entry => {
        for (let i = 0; i < entry.parent.children.length - value; i++) {
          entry.parent.removeChild(entry.parent.lastChild);
        }
      });
      return true;
    }
    this.#manipulators.forEach(x => x.set != undefined && x.set(name, target[name]));
    return true;
  }
}


class UpdateHandler {

  #variables
  #manipulators
  #node

  constructor(variables, manipulators, node) {
    this.#variables = variables;
    this.#manipulators = manipulators;
    this.#node = node;
  }

  get (target, name) {
    if (typeof target[name] === 'object' && Array.isArray(target[name]) && this.#variables.get(name)[0].type === "foreach") {
      const updateHandler = new ArrayUpdateHandler(this.#variables.get(name), this.#manipulators);
      return new Proxy(target[name], updateHandler);
    } else if (typeof target[name] === 'object') {
      return target[name];
    } else {
      return target[name];
    }
  }

  set (target, name, value) {
    target[name] = value;
    this.run(target);
    return true;    
  }

  run (target) {
    this.#manipulators.forEach(manipulator => {
      let manipulatedNode = undefined;
      if (this.#node) {
        const baseNode = manipulator.variables.path == "" ? node : node.querySelector(manipulator.variables.path);
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

  /**
   * 
   * @param {*} variables 
   * @param {*} manipulators 
   * @param {*} bindingDetails 
   */
  constructor(variables, manipulators) {
    this.#dataProxy = new Proxy({}, new UpdateHandler(variables, manipulators))
    this.#variables = variables;
    this.#manipulators = manipulators;
  }

  set data(newData) {
    let updateHandler = new UpdateHandler(this.#variables, this.#manipulators);
    this.#dataProxy = new Proxy(newData, updateHandler);
    updateHandler.run(newData);
  }

  get data() {
    return this.#dataProxy;
  }
}

/**
 * Bind a view to a mapping of its internal variables.
 */
function bind(template) {
  const templateNode = typeof template === 'string' ? document.querySelector(template) : template;
  if (templateNode) {
    const variables = domparser.parse(templateNode);
    const manipulators = DomManipulators.create(variables); 
    return new View(variables, manipulators);
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

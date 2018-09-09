let domparser = new DomParser();

function ArrayUpdateHandler(entry, manipulator) {

  let proxyCache = new WeakMap();

  this.get = function (target, name) {
    if (typeof target[name] === 'function' || typeof target[name] !== 'object') {
      return target[name];
    }

    let node = entry.parent.children[name];
    if (!proxyCache.has(node)) {
      proxyCache.set(node, new Proxy(target[name], new UpdateHandler(entry.variables, entry.manipulators, entry.parent.children[name])));
    }
    return proxyCache.get(node);
  }

  this.set = function (target, name, value) {
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
    console.log('set', name, value);
    target[name] = value;
    this.run(target);
  }

  this.run = function (target) {
    manipulators.forEach(manipulator => {
      let manipulatedNode = undefined;
      if(node) {
        let baseNode = manipulator.variables.path == "" ? node : node.querySelector(manipulator.variables.path);
        if(manipulator.variables.type == "text") {
          manipulatedNode = baseNode.childNodes[manipulator.variables.index];
        } else if (manipulator.variables.type == "attribute") {
          console.log(manipulator.variables.name);
          manipulatedNode = baseNode.getAttributeNode(manipulator.variables.name);
        } else {
          manipulatedNode = baseNode;
        }
      }
      manipulator.update(target, manipulatedNode)
    });
  }
}

function View(variables, manipulators, bindingDetails) {
  let dataProxy = new Proxy({}, new UpdateHandler(variables, manipulators));

  Object.defineProperty(this, 'data', {
    get: () => dataProxy,
    set: newData => {
      let updateHandler = new UpdateHandler(variables, manipulators);
      dataProxy = new Proxy(newData, updateHandler);
      updateHandler.run(newData);
      if (bindingDetails.onCreate && typeof bindingDetails.onCreate.$default === 'function') {
        bindingDetails.onCreate.$default(bindingDetails.baseNode);
      }
    }
  });
}

/**
 * Bind a view to a set of variables
 */
function bind(bindingDetails) {
  bindingDetails.baseNode = typeof bindingDetails.node === 'string'
    ? document.querySelector(bindingDetails.node)
    : bindingDetails.node;

  let variables = domparser.parse(bindingDetails);
  console.log(variables);
  let manipulators = DomManipulators.create(variables);
  return new View(variables, manipulators, bindingDetails);
}

let simpleview = {
  bind: bind
}

if (typeof require === 'function') {
  module.exports = simpleview;
} else {
  window.simpleview = simpleview;
}

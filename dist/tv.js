(function(){function TextParser() {
  let regexes = {
    variable: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*}}`, 'i'),
    condstr: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*}}`, 'i'),
    condstrelse: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*}}`, 'i'),
    cond: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*([^"]*)\\s*}}`, 'i'),
    text: new RegExp(`{{`, 'i')
  }

  /**
   * Push the leading text from a variable match unto the parsed list
   * 
   * @param {string} text 
   * @param {*} match 
   * @param {Array} parsed 
   */
  function pushLeadingText(text, match, parsed) {
    if (match.index > 0) {
      parsed.push({ type: 'txt', value: text.substr(0, match.index) });
    }
  }

  this.parse = function (text) {
    let values = [];
    let vars = new Set();
    let order = ['variable', 'condstrelse', 'condstr', 'cond', 'text'];
    let index = 0;
    let lastIndex = undefined;

    // Break the text up into specific identified chunks
    while (text.length > 0) {
      let match = null;
      if (lastIndex !== undefined && lastIndex === index) {
        throw `Error parsing ${text}`
      }
      lastIndex = index;

      // Loop through the regexes in the order specified
      for (let i in order) {
        if (text.length === 0) break;
        match = regexes[order[i]].exec(text);
        if (match) {
          index = match.index + match[0].length;
          switch (order[i]) {
            case 'variable':
              pushLeadingText(text, match, values);
              values.push({ type: 'var', name: match[1] });
              vars.add(match[1]);
              text = text.substr(index, text.length - index);
              break;
            case 'condstr':
            case 'cond':
              pushLeadingText(text, match, values);
              values.push({ type: order[i], var1: match[1], var2: match[2] });
              vars.add(match[1]);
              text = text.substr(index, text.length - index);
              if (order[i] === 'cond') vars.add(match[2]);
              break;
            case 'condstrelse':
              pushLeadingText(text, match, values);
              values.push({ type: 'condstrelse', var1: match[1], var2: match[2], var3: match[3] });
              vars.add(match[1]);
              text = text.substr(index, text.length - index);
              break;
            case 'text':
              pushLeadingText(text, match, values);
              text = text.substr(match.index, text.length - match.index);
              break;
          }
        }
        if (match) break;
      }

      // If none of the regexes match return the remaining part of the string as is
      if (match === null && text.length > 0) {
        values.push({ type: 'txt', value: text });
        break;
      }
    }
    return { variables: vars, structure: values }
  }
}
/**
 * Parses dom nodes for those with supported tv-* attributes.
 */
function DomParser() {

  let textParser = new TextParser();
  let attributeRegexes = ["tv-foreach", "tv-true", "tv-not-true", "(tv-value)-([a-z0-9_\-]+)", "(tv-).*"].map(regex => new RegExp(regex, 'i'));
  let parentId = Math.random();

  /**
   * Add a variable extracted from a node to the variables object
   * 
   * @param {Map} variables 
   * @param {string} variable 
   * @param {object} nodeDetails 
   */
  function addNodeToVariable(variables, variable, nodeDetails) {
    if (!variables.has(variable)) {
      variables.set(variable, []);
    }
    variables.get(variable).push(nodeDetails);
  }

  /**
   * Merge one set of variables into another
   * 
   * @param {Map} variables 
   * @param {Map} mergedVariables 
   */
  function mergeVariables(variables, mergedVariables) {
    mergedVariables.forEach((details, variable) => {
      if(variables.has(variable)) {
        variables.get(variable).concat(details);
      } else {
        variables.set(variable, details)
      }
    });
  }

  /**
   * Parse a given node for variables in its attributes.
   * Extract these nodes for later use
   * 
   * @param {Node} node 
   * @param {Map} variables 
   */
  function parseAttributes(node, variables, bindingDetails, path) {
    let parentDetected = false;
    let attributeVariables = new Map();

    for (let i in node.attributes) {
      let attribute = node.attributes[i];
      for (let regex of attributeRegexes) {
        let match = regex.exec(attribute.name);
        if (!match) continue;
        if (match[1] === 'tv-value') {
          parsed = textParser.parse(attribute.value);
          attributeNode = document.createAttribute(match[2]);
          node.setAttributeNode(attributeNode);
          parsed.variables.forEach(variable => {
            addNodeToVariable(attributeVariables, variable, { node: attributeNode, type: 'attribute', name: match[2], structure: parsed.structure, path: path })
          })
        } else if (match[0] === 'tv-true') {
          addNodeToVariable(attributeVariables, attribute.value, { node: node, type: 'truth', name: attribute.value, display: node.style.display, path: path })
        } else if (match[0] === 'tv-not-true') {
          addNodeToVariable(attributeVariables, attribute.value, { node: node, type: 'not-truth', name: attribute.value, display: node.style.display, path: path })
        } else if (match[0] == 'tv-foreach') {
          parentDetected = { 
            template: node, 
            type: 'foreach', 
            parent: node.parentNode, 
            name: attribute.value, 
            variables: attributeVariables, 
            events: [],
            callback: bindingDetails.onCreate && typeof bindingDetails.onCreate[attribute.value] === 'function' ? 
                        bindingDetails.onCreate[attribute.value] : false
          };
          
          addNodeToVariable(variables, attribute.value, parentDetected)
        }
        break;
      }
    }

    if(!parentDetected) {
      mergeVariables(variables, attributeVariables);
    }

    return parentDetected;
  }

  /**
   * Parse an element node and its children to find any text nodes or attributes that contain variables.
   * 
   * @param {Node} node 
   * @param {Map} variables 
   */
  function parseNode(node, variables, bindingDetails, path) {
    const parentDetected = parseAttributes(node, variables, bindingDetails, path);
    
    if (parentDetected) {
      variables = parentDetected.variables;
    }

    let n = 1;
    node.childNodes.forEach((child, index) => {
      let parsed = [];

      if (child.nodeType == Node.TEXT_NODE) {
        parsed = textParser.parse(child.textContent);
        parsed.variables.forEach(variable => {
          addNodeToVariable(variables, variable, 
            { 
              node: child, 
              type: 'text', 
              structure: parsed.structure,
              path: path,
              index: index
            });
        });
      } else if (child.nodeType == Node.ELEMENT_NODE) {
        parseNode(child, variables, bindingDetails, `${path}${path == "" ? "" : ">"}${child.nodeName}:nth-child(${n})`);
        n++;
      }
    });
  }

  /**
   * Parse a dom node and return a collection of variables their associated list of observers
   * and related dom manipulators.
   * @param {Node} node 
   */
  this.parse = function (bindingDetails) {
    const variables = new Map();
    parseNode(bindingDetails.templateNode, variables, bindingDetails, "");
    return variables;
  }
}

/**
 * manipulators.js
 * 
 * Tico-V directly manipulates the DOM with the manipulators defined in this file. Each of these manipulators can
 * be attached to particular tico-v elements within the DOM. Whenever data changes, manipulators are called to update
 * the DOM.
 */

/**
 * A utility function for rendering a text string when given a the parsed tree genereted by the text parser.
 * 
 * @param {Array} structure 
 * @param {Object} data 
 */
function renderText(structure, data) {
  return structure.reduce((string, segment) => {
    switch (segment.type) {
      case 'var': return string + data[segment.name];
      case 'txt': return string + segment.value;
      case 'cond': return string + (data[segment.var1] ? data[segment.var1] : data[segment.var2]);
      case 'condstr': return string + (data[segment.var1] ? segment.var2 : "");
      case 'condstrelse': return string + (data[segment.var1] ? segment.var2 : segment.var3);
    }
  }, "");
}

/**
 * Responsible for manipulating text nodes in the DOM.
 * 
 * @param {Object} entry 
 */
function TextNodeManipulator(entry) {

  this.update = function (data, node) {
    let final = node || entry.node;
    final.textContent = renderText(entry.structure, data)
  }
}

/**
 * Responsible for manipulating the values of attributes on DOM elements.
 * 
 * @param {Object} entry 
 */
function AttributeManipulator(entry) {
  this.update = function (data, node) {
    let final = node || entry.node;
    final.value = renderText(entry.structure, data);
  }
}

/**
 * Responsible for showing or hiding nodes based on the data passed.
 * 
 * @param {Object} entry 
 * @param {boolean} invert 
 */
function TruthAttrubuteManipulator(entry, invert) {

  this.update = function (data, node) {
    let final = node || entry.node;
    if ((data[entry.name] && !invert) || (!data[entry.name] && invert)) {
      final.style.display = entry.display;
    } else {
      final.style.display = 'none';
    }
  }
}

/**
 * Responsible for rendering repitions for array based data.
 * 
 * @param {Object} entry 
 */
function ForeachManipulator(entry) {

  let manipulators = DomManipulators.create(entry.variables);
  entry.manipulators = manipulators;

  function runCallback(node) {
    if(entry.callback) {
      entry.callback(node);
    }
  }

  function setupEvents(node) {
    entry.events.forEach(event => {
      if (event.path) {
        node.querySelector(event.path).addEventListener(event.name, event.callback);
      } else {
        node.addEventListener(event.name, event.callback);
      }
    })
  }

  this.update = function (data) {
    data = data[entry.name];
    entry.parent.innerHTML = "";
    if (!Array.isArray(data)) return;
    for (let row of data) {
      manipulators.forEach(manipulator => manipulator.update(row));
      let newNode = entry.template.cloneNode(true);
      setupEvents(newNode);
      entry.parent.appendChild(newNode);
      runCallback(newNode);
    }
  }

  this.set = function (key, data) {
    manipulators.forEach(manipulator => manipulator.update(data));
    let newNode = entry.template.cloneNode(true);
    setupEvents(newNode);
    if (key == entry.parent.children.length) {
      entry.parent.appendChild(newNode);
    } else {
      entry.parent.replaceChild(newNode, entry.parent.children[key]);
    }
    runCallback(newNode);
  }
}

/**
 * A factory for creating manipulators based on the type of the entry.
 */
const DomManipulators = {
  create: function (variables) {

    let manipulators = [];
    let manipulator;

    variables.forEach(variable => {
      variable.forEach(entry => {
        switch (entry.type) {
          case 'text':
            manipulator = new TextNodeManipulator(entry);
            break;
          case 'attribute':
            manipulator = new AttributeManipulator(entry);
            break;
          case 'truth':
            manipulator = new TruthAttrubuteManipulator(entry, false);
            break;
          case 'not-truth':
            manipulator = new TruthAttrubuteManipulator(entry, true);
            break;
          case 'foreach':
            manipulator = new ForeachManipulator(entry);
            break;
          default: throw `Unknown type ${entry.type}`
        }
        manipulator.variables = entry;
        manipulators.push(manipulator);
      });
    });

    return manipulators;
  }
}
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
})();
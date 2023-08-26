(function(){class TextParser {

  #regexes

  constructor() {
    this.#regexes = {
      variable: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*}}`, 'i'),
      condstr: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*}}`, 'i'),
      condstrelse: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*}}`, 'i'),
      cond: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*([^"]*)\\s*}}`, 'i'),
      text: new RegExp(`{{`, 'i')
    };
  }

  /**
   * Push the leading text from a variable match unto the parsed list
   * 
   * @param {string} text 
   * @param {*} match 
   * @param {Array} parsed 
   */
  #pushLeadingText(text, match, parsed) {
    if (match.index > 0) {
      parsed.push({ type: 'txt', value: text.substring(0, match.index) });
    }
  }

  parse = function (text) {
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
        match = this.#regexes[order[i]].exec(text);
        if (match) {
          index = match.index + match[0].length;
          switch (order[i]) {
            case 'variable':
              this.#pushLeadingText(text, match, values);
              values.push({ type: 'var', name: match[1] });
              vars.add(match[1]);
              text = text.substr(index, text.length - index);
              break;
            case 'condstr':
            case 'cond':
              this.#pushLeadingText(text, match, values);
              values.push({ type: order[i], var1: match[1], var2: match[2] });
              vars.add(match[1]);
              text = text.substr(index, text.length - index);
              if (order[i] === 'cond') vars.add(match[2]);
              break;
            case 'condstrelse':
              this.#pushLeadingText(text, match, values);
              values.push({ type: 'condstrelse', var1: match[1], var2: match[2], var3: match[3] });
              vars.add(match[1]);
              text = text.substr(index, text.length - index);
              break;
            case 'text':
              this.#pushLeadingText(text, match, values);
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
class DomParser {

  #textParser
  #attributeRegexes

  constructor() {
    this.#textParser = new TextParser();
    this.#attributeRegexes = ["tv-foreach", "tv-true", "tv-not-true", "(tv-value)-([a-z0-9_\-]+)", "(tv-).*"].map(regex => new RegExp(regex, 'i'));
  
  }

  /**
   * Add a variable extracted from a node to the variables object
   * 
   * @param {Map} variables 
   * @param {string} variable 
   * @param {object} nodeDetails 
   */
  #addNodeToVariable(variables, variable, nodeDetails) {
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
  #mergeVariables(variables, mergedVariables) {
    mergedVariables.forEach((details, variable) => {
      if(variables.has(variable)) {
        variables.get(variable).concat(details);
      } else {
        variables.set(variable, details)
      }
    });
  }

  /**
   * Parse a given node for variables in its attributes which can be later rendered.
   * This method returns a parent object in cases where the attribute dictates a foreach loop.
   * 
   * @param {Node} node 
   * @param {Map} variables 
   */
  #parseAttributes(node, variables, path) { 
    let parentDetected = false;
    const attributeVariables = new Map();
    let id;

    for (const attribute of node.attributes) {
      for (const regex of this.#attributeRegexes) {
        const match = regex.exec(attribute.name);
        if (!match) continue;

        if (match[1] === 'tv-value') {
          // Extract and create attribute nodes on the fly.
          const attributeNode = document.createAttribute(match[2]);
          const parsed = this.#textParser.parse(attribute.value);
          node.setAttributeNode(attributeNode);

          parsed.variables.forEach(variable => {
            this.#addNodeToVariable(attributeVariables, variable, 
              { node: attributeNode, type: 'attribute', name: match[2], structure: parsed.structure, path: path }
            )
          });
        } else if (match[0] === 'tv-true') {
          // Hide and display nodes according to the truthiness of variables.
          this.#addNodeToVariable(attributeVariables, attribute.value, 
            { node: node, type: 'truth', name: attribute.value, display: node.style.display, path: path }
          )
        } else if (match[0] === 'tv-not-true') {
          // Hide and display nodes according to the truthiness of variables.
          this.#addNodeToVariable(attributeVariables, attribute.value, 
            { node: node, type: 'not-truth', name: attribute.value, display: node.style.display, path: path }
          )
        } else if (match[0] == 'tv-foreach') {
          parentDetected = { 
            template: node.childNodes,
            childElementCount: node.childElementCount,
            type: 'foreach', 
            parent: node,
            name: attribute.value, 
            variables: attributeVariables,
            id: null
          };
          this.#addNodeToVariable(variables, attribute.value, parentDetected)
        } 
        break;
      }
    }

    if(!parentDetected) {
      this.#mergeVariables(variables, attributeVariables);
    } else if (parentDetected && id) {
      parentDetected['id'] = id;
    }

    return parentDetected;
  }

  /**
   * Parse an element node and its children to find any text nodes or attributes that contain variables to which 
   * bindings can be created.
   * 
   * @param {Node} node 
   * @param {Map} variables 
   */
  #parseNode(node, variables, path) {
    const parentDetected = this.#parseAttributes(node, variables, path);
    let children;
    
    if (parentDetected) {
      variables = parentDetected.variables;
      children = Array.from(node.childNodes).map(x => x.cloneNode(true));
    } else {
      children = node.childNodes;
    }

    let n = 1;
    children.forEach((child, index) => {
      let parsed = [];

      if (child.nodeType == Node.TEXT_NODE) {
        parsed = this.#textParser.parse(child.textContent);
        parsed.variables.forEach(variable => {
          this.#addNodeToVariable(variables, variable, 
            { 
              node: child, 
              type: 'text', 
              structure: parsed.structure,
              path: path,
              index: index
            });
        });
      } else if (child.nodeType == Node.ELEMENT_NODE) {
        const prefix = parentDetected ? "" : `${path}${path == "" ? "" : ">"}`;
        this.#parseNode(child, variables, `${prefix}${child.nodeName}:nth-child(${n})`);
        n++;
      }
    });

    if(parentDetected) {
      parentDetected.template = children;
    }
  }

  /**
   * Parse a dom node and return a collection of variables their associated list of observers
   * and related dom manipulators.
   * @param {Node} node 
   */
  parse (templateNode) {
    const variables = new Map();
    this.#parseNode(templateNode, variables, "");
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
function ForeachManipulator(entry, bindingDetails) {

  function dispatchEvents(nodes, data) {
    const event = new Event("tv-update");
    event.detail = {nodes: nodes.filter(x => x.nodeType != Node.TEXT_NODE || x.nodeValue.trim() != ""), data: data}
    entry.parent.dispatchEvent(event)
  }

  let manipulators = DomManipulators.create(entry.variables);
  entry.manipulators = manipulators;

  this.update = function (data) {
    data = data[entry.name];
    entry.parent.innerHTML = "";
    if (!Array.isArray(data)) {
      return;
    }
    for (let row of data) {
      const newNodes = [];
      manipulators.forEach(manipulator => manipulator.update(row));
      entry.template.forEach(x => {
        const newNode = x.cloneNode(true);
        newNodes.push(newNode);
        entry.parent.appendChild(newNode);
      });
      dispatchEvents(newNodes, row);
    }
  }

  this.set = function (key, data) {
    const newNodes = [];
    manipulators.forEach(manipulator => manipulator.update(data));

    entry.template.forEach((x, offset) => {
      const newNode = x.cloneNode(true);
      newNodes.push(newNode);
      if (key * entry.template.length + offset === entry.parent.childNodes.length) {
        entry.parent.appendChild(newNode);
      } else {
        entry.parent.replaceChild(newNode, entry.parent.childNodes[key * entry.template.length + offset]);
      }
    });
    dispatchEvents(newNodes, data);

    entry.parent.dispatchEvent
  }
}

/**
 * A factory for creating manipulators based on the type of the entry.
 */
const DomManipulators = {
  create: function (variables, bindingDetails) {
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
            manipulator = new ForeachManipulator(entry, bindingDetails);
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
})();
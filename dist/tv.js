(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["tv"] = factory();
	else
		root["tv"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/manipulators.js":
/*!*****************************!*\
  !*** ./src/manipulators.js ***!
  \*****************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DomManipulators: () => (/* binding */ DomManipulators)
/* harmony export */ });
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
class TextNodeManipulator {

  #entry

  constructor(entry) {
    this.#entry = entry
  }

  update(data, node) {
    (node || this.#entry.node).textContent = renderText(this.#entry.structure, data)
  }
}


/**
 * Responsible for manipulating the values of attributes on DOM elements.
 * 
 * @param {Object} entry 
 */
class AttributeManipulator {
  #entry

  constructor(entry) {
    this.#entry = entry
  }

  update(data, node) {
    (node || this.#entry.node).value = renderText(this.#entry.structure, data)
  }
}

/**
 * Responsible for showing or hiding nodes based on the data passed.
 * 
 * @param {Object} entry 
 * @param {boolean} invert 
 */
class TruthAttributeManipulator {

  #entry
  #invert

  constructor(entry, invert) {
    this.#entry = entry
    this.#invert = invert
  }

  update(data, node) {
    let final = node || this.#entry.node;
    if ((data[this.#entry.name] && !this.#invert) || (!data[this.#entry.name] && this.#invert)) {
      final.style.display = this.#entry.display;
    } else {
      final.style.display = 'none';
    }
  }
}

class ForeachManipulator {

  #entry
  #manipulators

  constructor(entry, bindingDetails) {
    this.#entry = entry
    this.#manipulators = DomManipulators.create(entry.variables, bindingDetails)
    this.#entry.manipulators = this.#manipulators
  }

  #dispatchEvents(nodes, data) {
    const event = new Event("tv-update");
    event.detail = {nodes: nodes.filter(x => x.nodeType != Node.TEXT_NODE || x.nodeValue.trim() != ""), data: data}
    this.#entry.parent.dispatchEvent(event)
  }

  update (data) {
    data = data[this.#entry.name];
    this.#entry.parent.innerHTML = "";
    if (!Array.isArray(data)) {
      return;
    }
    for (let row of data) {
      const newNodes = [];
      this.#manipulators.forEach(manipulator => manipulator.update(row));
      this.#entry.template.forEach(x => {
        const newNode = x.cloneNode(true);
        newNodes.push(newNode);
        this.#entry.parent.appendChild(newNode);
      });
      this.#dispatchEvents(newNodes, row);
    }
  }

  set (key, data) {
    const newNodes = [];
    this.#manipulators.forEach(manipulator => manipulator.update(data));

    this.#entry.template.forEach((x, offset) => {
      const newNode = x.cloneNode(true);
      newNodes.push(newNode);
      if (key * this.#entry.template.length + offset === this.#entry.parent.childNodes.length) {
        this.#entry.parent.appendChild(newNode);
      } else {
        this.#entry.parent.replaceChild(newNode, this.#entry.parent.childNodes[key * this.#entry.template.length + offset]);
      }
    });
    this.#dispatchEvents(newNodes, data);
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
            manipulator = new TruthAttributeManipulator(entry, false);
            break;
          case 'not-truth':
            manipulator = new TruthAttributeManipulator(entry, true);
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



/***/ }),

/***/ "./src/parsers.js":
/*!************************!*\
  !*** ./src/parsers.js ***!
  \************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DomParser: () => (/* binding */ DomParser)
/* harmony export */ });
class TextParser {

    #regexes
    #tokens

    constructor() {
        this.#regexes = {
            variable: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*}}`, 'i'),
            condstr: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*}}`, 'i'),
            condstrelse: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*}}`, 'i'),
            cond: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*([^"]*)\\s*}}`, 'i'),
            text: new RegExp(`{{`, 'i')
        }
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
            parsed.push({type: 'txt', value: text.substring(0, match.index)});
        }
    }

    parse (text) {
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
                match = this.#regexes[order[i]].exec(text)
                if (match) {
                    index = match.index + match[0].length
                    switch (order[i]) {
                        case 'variable':
                            this.#pushLeadingText(text, match, values)
                            values.push({type: 'var', name: match[1]})
                            vars.add(match[1])
                            text = text.substr(index, text.length - index)
                            break;
                        case 'condstr':
                        case 'cond':
                            this.#pushLeadingText(text, match, values);
                            values.push({type: order[i], var1: match[1].trim(), var2: match[2].trim()})
                            vars.add(match[1].trim())
                            text = text.substr(index, text.length - index)
                            if (order[i] === 'cond') vars.add(match[2].trim())
                            break;
                        case 'condstrelse':
                            this.#pushLeadingText(text, match, values)
                            values.push({type: 'condstrelse', var1: match[1], var2: match[2], var3: match[3]})
                            vars.add(match[1])
                            text = text.substr(index, text.length - index)
                            break;
                        case 'text':
                            this.#pushLeadingText(text, match, values)
                            text = text.substr(match.index, text.length - match.index)
                            break
                    }
                }
                if (match) break
            }

            // If none of the regexes match return the remaining part of the string as is
            if (match === null && text.length > 0) {
                values.push({type: 'txt', value: text})
                break
            }
        }
        return {variables: vars, structure: values}
    }
}


/**
 * Parses dom nodes for those with supported tv-* attributes.
 */
class DomParser {

    #textParser
    #attributeRegexes

    constructor() {
        this.#textParser = new TextParser()
        this.#attributeRegexes = [
            "tv-foreach", "tv-true", "tv-not-true", "(tv-value)-([a-z0-9_\-]+)", "(tv-).*"
        ].map(regex => new RegExp(regex, 'i'))
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
            variables.set(variable, [])
        }
        variables.get(variable).push(nodeDetails)
    }

    /**
     * Merge one set of variables into another
     *
     * @param {Map} variables
     * @param {Map} mergedVariables
     */
    #mergeVariables(variables, mergedVariables) {
        mergedVariables.forEach((details, variable) => {
            if (variables.has(variable)) {
                variables.get(variable).concat(details)
            } else {
                variables.set(variable, details)
            }
        });
    }

    /**
     * Parse a given node for variables in its attributes that can be rendered later.
     * This method returns a parent object in cases where the attribute dictates a foreach loop.
     *
     * @param {Node} node
     * @param {Map} variables
     * @param {string} path
     */
    #parseAttributes(node, variables, path) {
        let parentDetected = false;
        const attributeVariables = new Map()
        let id;

        for (const attribute of node.attributes) {
            for (const regex of this.#attributeRegexes) {
                const match = regex.exec(attribute.name)
                if (!match) continue

                if (match[1] === 'tv-value') {
                    // Extract and create attribute nodes on the fly.
                    const attributeNode = document.createAttribute(match[2])
                    const parsed = this.#textParser.parse(attribute.value)
                    node.setAttributeNode(attributeNode)

                    parsed.variables.forEach(variable => {
                        this.#addNodeToVariable(attributeVariables, variable,
                            {
                                node: attributeNode,
                                type: 'attribute',
                                name: match[2],
                                structure: parsed.structure,
                                path: path
                            }
                        )
                    })
                } else if (match[0] === 'tv-true') {
                    // Hide and display nodes according to the truthiness of variables.
                    this.#addNodeToVariable(attributeVariables, attribute.value,
                        {node: node, type: 'truth', name: attribute.value, display: node.style.display, path: path}
                    )
                } else if (match[0] === 'tv-not-true') {
                    // Hide and display nodes according to the truthiness of variables.
                    this.#addNodeToVariable(attributeVariables, attribute.value,
                        {node: node, type: 'not-truth', name: attribute.value, display: node.style.display, path: path}
                    )
                } else if (match[0] === 'tv-foreach') {
                    parentDetected = {
                        template: node.childNodes,
                        childElementCount: node.childElementCount,
                        type: 'foreach',
                        parent: node,
                        name: attribute.value,
                        variables: attributeVariables,
                        path: path,
                        id: null
                    }
                    this.#addNodeToVariable(variables, attribute.value, parentDetected)
                }
                break;
            }
        }

        if (!parentDetected) {
            this.#mergeVariables(variables, attributeVariables);
        } else if (parentDetected && id) {
            parentDetected['id'] = id
        }
        attributeVariables.forEach(x => x.path)
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
            children = Array.from(node.childNodes).map(x => x.cloneNode(true))
        } else {
            children = node.childNodes
        }

        let n = 1;
        children.forEach((child, index) => {
            let parsed = [];

            if (child.nodeType === Node.TEXT_NODE) {
                parsed = this.#textParser.parse(child.textContent)
                parsed.variables.forEach(variable => {
                    this.#addNodeToVariable(variables, variable,
                        {
                            node: child,
                            type: 'text',
                            structure: parsed.structure,
                            path: path,
                            index: index
                        })
                })
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                this.#parseNode(child, variables, parentDetected ? "" : `${path}${path === "" ? "" : ">"}${child.nodeName}:nth-child(${n})`)
                n++
            }
        });

        if (parentDetected) {
            parentDetected.template = children
        }
    }

    /**
     * Parse a dom node and return a collection of variables their associated list of observers
     * and related dom manipulators.
     * @param {Node} templateNode
     */
    parse(templateNode) {
        const variables = new Map()
        this.#parseNode(templateNode, variables, "")
        return variables
    }
}




/***/ }),

/***/ "./src/update_handlers.js":
/*!********************************!*\
  !*** ./src/update_handlers.js ***!
  \********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ArrayUpdateHandler: () => (/* binding */ ArrayUpdateHandler),
/* harmony export */   UpdateHandler: () => (/* binding */ UpdateHandler)
/* harmony export */ });
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

    get(target, name) {
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
        return this.#proxyCache.get(node);
    }

    set(target, name, value) {
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

    get(target, name) {
        if (typeof target[name] === 'object' && Array.isArray(target[name]) && this.#variables.get(name)[0].type === "foreach") {
            const updateHandler = new ArrayUpdateHandler(this.#variables.get(name), this.#manipulators);
            return new Proxy(target[name], updateHandler);
        } else if (typeof target[name] === 'object') {
            return target[name];
        } else {
            return target[name];
        }
    }

    set(target, name, value) {
        target[name] = value;
        this.run(target);
        return true;
    }

    run(target) {
        this.#manipulators.forEach(manipulator => {
            let manipulatedNode = undefined;
            if (this.#node) {
                const baseNode = manipulator.variables.path === "" ? this.#node : this.#node.querySelector(manipulator.variables.path);
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



/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!*************************!*\
  !*** ./src/ticoview.js ***!
  \*************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   bind: () => (/* binding */ bind)
/* harmony export */ });
/* harmony import */ var _parsers_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./parsers.js */ "./src/parsers.js");
/* harmony import */ var _manipulators_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./manipulators.js */ "./src/manipulators.js");
/* harmony import */ var _update_handlers_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./update_handlers.js */ "./src/update_handlers.js");





/**
 * A view contains the dom elements with associated tico-v tags that can be bound to data items.
 */
class View {

  #dataProxy
  #variables
  #manipulators

  /**
   * Create a new Tico View
   * @param {*} variables 
   * @param {*} manipulators
   */
  constructor(variables, manipulators) {
    this.#dataProxy = new Proxy({}, new _update_handlers_js__WEBPACK_IMPORTED_MODULE_2__.UpdateHandler(variables, manipulators))
    this.#variables = variables
    this.#manipulators = manipulators
  }

  /**
   * Setter for the data variable.
   * @param newData
   */
  set data(newData) {
    let updateHandler = new _update_handlers_js__WEBPACK_IMPORTED_MODULE_2__.UpdateHandler(this.#variables, this.#manipulators)
    this.#dataProxy = new Proxy(newData, updateHandler)
    updateHandler.run(newData)
  }

  /**
   * Getter for the data variable.
   * @returns {*}
   */
  get data() {
    return this.#dataProxy
  }
}

/**
 * Bind a view to a mapping of its internal variables.
 */
function bind(template) {
  const templateNode = typeof template === 'string' ? document.querySelector(template) : template;
  if (templateNode) {
    const domparser = new _parsers_js__WEBPACK_IMPORTED_MODULE_0__.DomParser()
    const variables = domparser.parse(templateNode)
    const manipulators = _manipulators_js__WEBPACK_IMPORTED_MODULE_1__.DomManipulators.create(variables)
    return new View(variables, manipulators)
  } else {
    throw new Error("Could not find template node")
  }
}

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=tv.js.map
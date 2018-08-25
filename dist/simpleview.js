(function(){function TextParser() 
{
    let regexes = {
        variable : new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*}}`, 'i'),
        condstr : new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*}}`, 'i'),
        condstrelse : new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*}}`, 'i'),
        cond : new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*([^"]*)\\s*}}`, 'i'),
        text : new RegExp(`{{`, 'i')        
    }

    /**
     * Push the leading text from a variable match unto the parsed list
     * 
     * @param {string} text 
     * @param {*} match 
     * @param {Array} parsed 
     */
    function pushLeadingText(text, match, parsed) {
        if(match.index > 0) {
            parsed.push({type: 'txt', value: text.substr(0, match.index)});
        }        
    }

    this.parse = function (text) {
        let values = [];
        let vars = new Set();
        let order = ['variable', 'condstrelse', 'condstr', 'cond', 'text'];
        let index = 0;
        let lastIndex = undefined;
    
        // Break the text up into specific identified chunks
        while(text.length > 0) {
          let match = null;
          if(lastIndex !== undefined && lastIndex === index) {
            throw `Error parsing ${text}`
          }
          lastIndex = index;
    
          // Loop through the regexes in the order specified
          for(let i in order) {
            if(text.length === 0) break;
            match = regexes[order[i]].exec(text);
            if(match) {
              index = match.index + match[0].length;
              switch (order[i]) {
                case 'variable':
                  pushLeadingText(text, match, values);
                  values.push({type: 'var', name: match[1]});
                  vars.add(match[1]);
                  text = text.substr(index, text.length - index);
                  break;
                case 'condstr':
                case 'cond':
                  pushLeadingText(text, match, values);
                  values.push({type: order[i], var1: match[1], var2: match[2]});
                  vars.add(match[1]);
                  text = text.substr(index, text.length - index);
                  if(order[i] === 'cond') vars.add(match[2]);
                  break;
                case 'condstrelse':
                  pushLeadingText(text, match, values);
                  values.push({type: 'condstrelse', var1: match[1], var2: match[2], var3: match[3]});
                  vars.add(match[1]);
                  text = text.substr(index, text.length - index);
                  break;
                case 'text':
                  pushLeadingText(text, match, values);
                  text = text.substr(match.index, text.length - match.index);
                  break;
              }
            }
            if(match) break;
          }
    
          // If none of the regexes match return the remaining part of the string as is
          if(match === null && text.length > 0) {
            values.push({type: 'txt', value: text});
            break;
          }
        }
    
        return {variables: vars, structure: values}
    
    }
}
/**
 * 
 */
function DomParser() {

  let textParser = new TextParser();
  let attributeRegexes = ["sv-foreach", "sv-true", "sv-not-true", "(sv-value)-([a-z0-9_\-]+)", "(sv-).*"].map(regex => new RegExp(regex, 'i'));
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
   * 
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
  function parseAttributes(node, variables) {
    let parentDetected = false;
    let attributeVariables = new Map();

    for (let i in node.attributes) {
      let attribute = node.attributes[i];
      for (let regex of attributeRegexes) {
        let match = regex.exec(attribute.name);
        if (!match) continue;
        if (match[1] === 'sv-value') {
          parsed = textParser.parse(attribute.value);
          attributeNode = document.createAttribute(match[2]);
          node.setAttributeNode(attributeNode);
          parsed.variables.forEach(variable => {
            addNodeToVariable(attributeVariables, variable, { node: attributeNode, type: 'attribute', name: match[2], structure: parsed.structure })
          })
        } else if (match[0] === 'sv-true') {
          addNodeToVariable(attributeVariables, attribute.value, { node: node, type: 'truth', name: attribute.value, display: node.style.display })
        } else if (match[0] === 'sv-not-true') {
          addNodeToVariable(attributeVariables, attribute.value, { node: node, type: 'not-truth', name: attribute.value, display: node.style.display })
        } else if (match[0] == 'sv-foreach') {
          parentDetected = { template: node, type: 'foreach', parent: node.parentNode, name: attribute.value, variables: attributeVariables, nodes: [] };
          parentDetected.parent.removeAttribute('id');
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
  function parseNode(node, variables) {
    let parentDetected = parseAttributes(node, variables);
    //let childId = 0;

    if (parentDetected) {
      console.log(parentDetected);
      variables = parentDetected.variables;
    }

    node.childNodes.forEach(child => {
      let parsed = [];

      if (child.nodeType == Node.TEXT_NODE) {
        parsed = textParser.parse(child.textContent);
        parsed.variables.forEach(variable => {
          addNodeToVariable(variables, variable, { node: child, type: 'text', structure: parsed.structure })
        });
      } else if (child.nodeType == Node.ELEMENT_NODE) {
        // if (parentDetected) {
        //   child.setAttribute("id", `${parentId}-${childId++}`)
        // }
        parseNode(child, variables);
      }
    });
  }

  /**
   * Parse a dom node and return a collection of variables their associated list of observers
   * and related dom manipulators.
   * @param {Node} node 
   */
  this.parse = function (node) {
    let variables = new Map();
    parseNode(node, variables);
    return variables;
  }
}

function renderText(structure, data) {
    return structure.reduce((string, segment) => {
        switch(segment.type) {
          case 'var': return string + data[segment.name];
          case 'txt': return string + segment.value;
          case 'cond': return string + (data[segment.var1] ? data[segment.var1] : data[segment.var2]);
          case 'condstr': return string + (data[segment.var1] ? segment.var2 : "");
          case 'condstrelse': return string + (data[segment.var1] ? segment.var2 : segment.var3);
        }
      }, "");        
}

function TextNodeManipulator(entry) {

    this.update = function(data, node) {
        let final = node || entry.node;
        final.textContent = renderText(entry.structure, data)
    }
}

function AttributeManipulator(entry) {
    this.update = function(data, node) {
        let final = node || entry.node;
        final.value = renderText(entry.structure, data);
    }
}

function TruthAttrubuteManipulator(entry, invert) {
    
    this.update = function(data, node) {
        let final = node || entry.node;
        if((data[entry.name] && !invert) || (!data[entry.name] && invert)) {
            final.style.display = entry.display;
        } else {
            final.style.display = 'none';
        }
    }
}

function ForeachManipulator(entry) {

    let manipulators = DomManipulators.create(entry.variables);
    entry.manipulators = manipulators;

    this.update = function (data) {
        data = data[entry.name];
        if(!Array.isArray(data)) throw new "For each variable must be an array";
        entry.parent.innerHTML = "";
        for(let row of data) {
            manipulators.forEach(manipulator => manipulator.update(row));
            entry.parent.appendChild(entry.template.cloneNode(true));
        }
    }
}

/**
 * Manipulate the DOM
 */
const DomManipulators = {
    create : function(variables) {

        let manipulators = [];
        let manipulator;

        variables.forEach( variable => {
            variable.forEach( entry => {
                switch(entry.type) {
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
                manipulators.push(manipulator);
            });
        });

        return manipulators;
    }
}
let domparser = new DomParser();

function ArrayUpdateHandler(entry) {
    let proxyCache = new WeakMap();

    this.get = function(target, name) {
        if(typeof target[name] === 'function' || typeof target[name] !== 'object') {
            return target[name];
        }

        let node = entry.parent.children[name];
        if(!proxyCache.has(node)) {
            proxyCache.set(node, new Proxy(target[name], new UpdateHandler(entry.variables, entry.manipulators, entry.parent.children[name])));
        }
        return proxyCache.get(node);
    }

    this.set = function(target, name, value) {
        if(name === 'length') {
            for(let i = 0; i < entry.parent.children.length - value; i++) {
                entry.parent.removeChild(entry.parent.lastChild);
            }
            target[name] = value;
            return true;
        }

        target[name] = value;

        entry.manipulators.forEach(manipulator => manipulator.update(value));
        entry.parent.replaceChild(entry.template.cloneNode(true), entry.parent.children[name]);

        return true;

    }
}

function UpdateHandler(variables, manipulators, node) {
    this.get = function (target, name) {
        if(typeof target[name] === 'object' && Array.isArray(target[name]) && variables.get(name)[0].type === "foreach") {
            let entry = variables.get(name)[0];
            let updateHandler = new ArrayUpdateHandler(entry);
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
    }

    this.run = function(target) {
        manipulators.forEach(manipulator => manipulator.update(target, node));
    }
}

function View(variables, manipulators) {
    let dataProxy = new Proxy({}, new UpdateHandler(variables, manipulators));

    Object.defineProperty(this, 'data', {
        get: () => dataProxy,
        set: newData => {
            let updateHandler = new UpdateHandler(variables, manipulators);
            dataProxy = new Proxy(newData, updateHandler);
            updateHandler.run(newData);
        }
    });    
}

/**
 * Bind a view to a set of variables
 */
function bind(bindingDetails) {
    let baseNode = typeof bindingDetails.node === 'string' 
        ? document.querySelector(bindingDetails.node) 
        : bindingDetails.node;

    let variables = domparser.parse(baseNode);
    let manipulators = DomManipulators.create(variables);

    return new View(variables, manipulators)
}

let simpleview = {
    bind: bind
}

if (typeof require === 'function') {
  module.exports = simpleview;
} else {
  window.simpleview = simpleview;
}
})();
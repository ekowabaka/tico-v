/**
 * 
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
    let parentDetected = parseAttributes(node, variables, bindingDetails, path);
    
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
    let variables = new Map();
    parseNode(bindingDetails.templateNode, variables, bindingDetails, "");
    return variables;
  }
}

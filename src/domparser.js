function DomParser() {

    let textParser = new TextParser()
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
        if(!variables.has(variable)) {
            variables.set(variable, []);
        }
        variables.get(variable).push(nodeDetails);
    }

    /**
     * Parse a given node for variables in its attributes.
     * 
     * @param {Node} node 
     * @param {Map} variables 
     */
    function parseAttributes(node, variables) {
        let parentDetected = false;

        for(let i in node.attributes) {
            let attribute = node.attributes[i];
            for(let regex of attributeRegexes) {
                let match = regex.exec(attribute.name);
                if(!match) continue;
                if(match[1] === 'sv-value') {
                    parsed = textParser.parse(attribute.value);
                    attributeNode = document.createAttribute(match[2]);
                    node.setAttributeNode(attributeNode);
                    parsed.variables.forEach(variable => {
                        addNodeToVariable(variables, variable, {node: attributeNode, type: 'attribute', name: match[2], structure: parsed.structure})
                    })
                } else if (match[0] === 'sv-true') {
                    addNodeToVariable(variables, attribute.value, {node: node, type: 'truth', name: attribute.value, display: node.style.display})
                } else if (match[0] === 'sv-not-true') {
                    addNodeToVariable(variables, attribute.value, {node: node, type: 'not-truth', name: attribute.value, display: node.style.display})
                } else if (match[0] == 'sv-foreach') {
                    parentDetected = {template: node, type:'foreach', parent: node.parentNode, name: attribute.value, variables: null, nodes: []};
                    parentDetected.parent.removeAttribute('id');
                    addNodeToVariable(variables, attribute.value, parentDetected)
                }
                break;
            }
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
        let childId = 0;

        if(parentDetected) {
            variables = new Map();
            parentDetected.variables = variables;
        }

        node.childNodes.forEach(child => {
            let parsed = [];

            if(child.nodeType == Node.TEXT_NODE) {
                parsed = textParser.parse(child.textContent);
                parsed.variables.forEach(variable => {
                    addNodeToVariable(variables, variable, {node: child, type: 'text', structure: parsed.structure})
                });
            } else if (child.nodeType == Node.ELEMENT_NODE) {
                if(parentDetected) {
                    child.setAttribute("id", `${parentId}-${childId++}`)
                }
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

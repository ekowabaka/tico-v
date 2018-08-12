function DomParser() {

    let textParser = new TextParser()
    let attributeRegexes = ["sv-foreach", "sv-true", "sv-not-true", "(sv-value)-([a-z0-9_\-]+)", "(sv-).*"].map(regex => new RegExp(regex, 'i'));

    function addNodeToVariable(variables, variable, nodeDetails) {
        if(!variables.has(variable)) {
            variables.set(variable, []);
        }
        variables.get(variable).push(nodeDetails);
    }

    function parseAttributes(node, variables) {
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
                }
            }
        }
    }

    function parseNode(node, variables) {
        parseAttributes(node, variables);
        node.childNodes.forEach(child => {
            let parsed = [];

            if(child.nodeType == Node.TEXT_NODE) {
                parsed = textParser.parse(child.textContent);
                parsed.variables.forEach(variable => {
                    addNodeToVariable(variables, variable, {node: child, type: 'text', structure: parsed.structure})
                });
            } else if (child.nodeType == Node.ELEMENT_NODE) {
                parseNode(child, variables);
            }
        });

        return variables;
    }

    /**
     * Parse a dom node and return a collection of variables their associated list of observers
     * and related dom manipulators.
     * @param {Node} node 
     */
    this.parse = function (node) {
        let variables = new Map();
        return parseNode(node, variables);
    }
}

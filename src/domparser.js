function DomParser() {

    let textParser = new TextParser()

    function addNodeToVariable(variables, variable, nodeDetails) {
        if(!variables.has(variable)) {
            variables.set(variable, []);
        }
        variables.get(variable).push(nodeDetails);
    }

    /**
     * Parse a dom node and return a collection of variables their associated list of observers
     * and related dom manipulators.
     * @param {Node} node 
     */
    this.parse = function (node) {
        let variables = new Map();

        node.childNodes.forEach(child => {
            if(child.nodeType == Node.TEXT_NODE) {
                let parsed = textParser.parse(child.textContent);
                parsed.variables.forEach(variable => {
                    addNodeToVariable(variables, variable, {node: child, type: 'text', structure: parsed.structure})
                });
            }
        });

        return variables;
    }
}

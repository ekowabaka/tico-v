class TextParser {

    #regexes

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
            "tv-foreach", "tv-true", "tv-not-true", "(tv-value)-([a-z0-9_\-]+)", "(tv-set)-([a-z0-9_\-]+)", "(tv-).*"
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
     * Merge one set of into into another
     *
     * @param {Map} into
     * @param {Map} from
     */
    #mergeVariables(into, from) {
        from.forEach((details, variable) => {
            if (into.has(variable)) {
                into.set(variable, into.get(variable).concat(details))
            } else {
                into.set(variable, details)
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
    #parseAttributes(node, path) {

        const response = {
            parentVariable: null,
            variables: new Map()
        }

        for (const attribute of node.attributes) {
            for (const regex of this.#attributeRegexes) {
                const match = regex.exec(attribute.name)
                if (!match) continue

                if (match[1] === 'tv-value') {
                    // Extract and set attribute node values on the fly.
                    const attributeNode = document.createAttribute(match[2])
                    const parsed = this.#textParser.parse(attribute.value)
                    node.setAttributeNode(attributeNode)

                    parsed.variables.forEach(variable => {
                        this.#addNodeToVariable(response.variables, variable,
                            {
                                node: attributeNode,
                                type: 'attribute',
                                name: match[2],
                                structure: parsed.structure,
                                path: path
                            }
                        )
                    })
                } else if (match[1] === 'tv-set') {
                    // Extract and set the attribute node on the fly.
                    this.#addNodeToVariable(response.variables, attribute.value,
                        {
                            node: node,
                            type: 'set',
                            name: attribute.value,
                            path: path,
                            attribute: match[2],
                        })
                } else if (match[0] === 'tv-true') {
                    // Hide and display nodes according to the truthiness of variables.
                    this.#addNodeToVariable(response.variables, attribute.value,
                        {node: node, type: 'truth', name: attribute.value, display: node.style.display, path: path}
                    )
                } else if (match[0] === 'tv-not-true') {
                    // Hide and display nodes according to the truthiness of variables.
                    this.#addNodeToVariable(response.variables, attribute.value,
                        {node: node, type: 'not-truth', name: attribute.value, display: node.style.display, path: path}
                    )
                } else if (match[0] === 'tv-foreach') {
                    response.parentVariable = {
                        template: node.childNodes,
                        childElementCount: node.childElementCount,
                        type: 'foreach',
                        parent: node,
                        name: attribute.value,
                        variables: new Map(),
                        path: path,
                        id: null
                    }
                }
                break;
            }
        }

        return response
    }

    /**
     * Parse an element node and its children to find any text nodes or attributes that contain variables to which
     * bindings can be created.
     *
     * @param {Node} node
     * @param {Map} variables
     */
    #parseNode(node, path) {
        const variables = new Map()
        const attributes = this.#parseAttributes(node, path);
        let children;

        if (attributes.parentVariable) {
            // variables = parentDetected.variables;
            children = Array.from(node.childNodes).map(x => x.cloneNode(true))
            attributes.parentVariable.template = children
        } else {
            children = node.childNodes
        }
        this.#mergeVariables(variables, attributes.variables)

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
                const childVariables = this.#parseNode(child, attributes ? "" : `${path}${path === "" ? "" : ">"}${child.nodeName}:nth-child(${n})`)
                if (attributes.parentVariable) {
                    this.#mergeVariables(attributes.parentVariable.variables, childVariables)
                    this.#addNodeToVariable(variables, attributes.parentVariable.name, attributes.parentVariable)
                } else {
                    this.#mergeVariables(variables, childVariables)
                }
                n++
            }
        });

        return variables
    }

    /**
     * Parse a dom node and return a collection of variables their associated list of observers
     * and related dom manipulators.
     * @param {Node} templateNode
     */
    parse(templateNode) {
        return this.#parseNode(templateNode, "")
    }
}

export {DomParser}

class TextParser {

    #regexes

    constructor() {
        this.#regexes = {
            rawVariable: new RegExp(`{{{\\s*([a-z][a-z0-9_]*)\\s*}}}`, 'i'),
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
        let order = ['rawVariable', 'variable', 'condstrelse', 'condstr', 'cond', 'text'];
        let index = 0;
        let lastIndex = undefined;

        // Break the text up into specific identified chunks
        while (text.length > 0) {
            let bestMatch = null;
            let bestOrderType = null;

            if (lastIndex !== undefined && lastIndex === index) {
                throw `Error parsing ${text}`
            }
            lastIndex = index;

            // Find the earliest match among all regexes
            for (let i in order) {
                const match = this.#regexes[order[i]].exec(text)
                if (match) {
                    if (bestMatch === null || match.index < bestMatch.index) {
                        bestMatch = match;
                        bestOrderType = order[i];
                    }
                }
            }

            if (bestMatch) {
                const match = bestMatch;
                const type = bestOrderType;
                index = match.index + match[0].length
                switch (type) {
                    case 'rawVariable':
                        this.#pushLeadingText(text, match, values)
                        values.push({type: 'raw', name: match[1]})
                        vars.add(match[1])
                        text = text.substr(index, text.length - index)
                        break;
                    case 'variable':
                        this.#pushLeadingText(text, match, values)
                        values.push({type: 'var', name: match[1]})
                        vars.add(match[1])
                        text = text.substr(index, text.length - index)
                        break;
                    case 'condstr':
                    case 'cond':
                        this.#pushLeadingText(text, match, values);
                        values.push({type: type, var1: match[1].trim(), var2: match[2].trim()})
                        vars.add(match[1].trim())
                        text = text.substr(index, text.length - index)
                        if (type === 'cond') vars.add(match[2].trim())
                        break;
                    case 'condstrelse':
                        this.#pushLeadingText(text, match, values)
                        values.push({type: 'condstrelse', var1: match[1], var2: match[2], var3: match[3]})
                        vars.add(match[1])
                        text = text.substr(index, text.length - index)
                        break;
                    case 'text':
                        this.#pushLeadingText(text, match, values)
                        text = text.substr(match.index + 2, text.length - (match.index + 2))
                        break
                }
            } else {
                // If none of the regexes match return the remaining part of the string as is
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
            children = Array.from(node.childNodes).map(x => x.cloneNode(true))
            attributes.parentVariable.template = children
        } else {
            children = Array.from(node.childNodes)
        }
        this.#mergeVariables(variables, attributes.variables)

        let n = 1;
        let indexOffset = 0;
        children.forEach((child, index) => {
            let parsed = [];

            if (child.nodeType === Node.TEXT_NODE) {
                parsed = this.#textParser.parse(child.textContent)
                const hasRaw = parsed.structure.some(s => s.type === 'raw');

                if (hasRaw) {
                    // Split the text node into multiple nodes
                    const segments = [];
                    let current = { type: 'text', structure: [], variables: new Set() };

                    parsed.structure.forEach(s => {
                        if (s.type === 'raw') {
                            if (current.structure.length > 0) {
                                segments.push(current);
                                current = { type: 'text', structure: [], variables: new Set() };
                            }
                            segments.push({ type: 'raw', name: s.name });
                        } else {
                            current.structure.push(s);
                            if (s.name) current.variables.add(s.name);
                            if (s.var1) current.variables.add(s.var1);
                            if (s.var2) current.variables.add(s.var2);
                            if (s.var3) current.variables.add(s.var3);
                        }
                    });
                    if (current.structure.length > 0) segments.push(current);

                    const parent = child.parentNode || node;
                    const newNodes = [];
                    segments.forEach((segment) => {
                        if (segment.type === 'raw') {
                            const placeholder = document.createElement('span');
                            placeholder.style.display = 'contents';
                            newNodes.push(placeholder);
                        } else {
                            const newTextNode = document.createTextNode("");
                            newTextNode.textContent = segment.structure.reduce((str, s) => {
                                return str + (s.type === 'txt' ? s.value : "");
                            }, "");
                            newNodes.push(newTextNode);
                        }
                    });

                    // Replace the old text node with new nodes in the actual DOM or template
                    newNodes.forEach((newNode) => {
                        parent.insertBefore(newNode, child);
                    });
                    parent.removeChild(child);

                    // Now bind variables to the actual nodes in the DOM
                    segments.forEach((segment, sIndex) => {
                        const actualNode = newNodes[sIndex];
                        const actualIndex = Array.from(parent.childNodes).indexOf(actualNode);
                        
                        if (segment.type === 'raw') {
                            this.#addNodeToVariable(variables, segment.name, {
                                node: actualNode,
                                type: 'raw',
                                name: segment.name,
                                path: path,
                                index: actualIndex
                            });
                            n++;
                        } else {
                            segment.variables.forEach(variable => {
                                this.#addNodeToVariable(variables, variable, {
                                    node: actualNode,
                                    type: 'text',
                                    structure: segment.structure,
                                    path: path,
                                    index: actualIndex
                                });
                            });
                        }
                    });

                    if (attributes.parentVariable) {
                        // Update the template array for foreach
                        children.splice(index + indexOffset, 1, ...newNodes);
                    }
                    indexOffset += newNodes.length - 1;
                } else {
                    parsed.variables.forEach(variable => {
                        this.#addNodeToVariable(variables, variable,
                            {
                                node: child,
                                type: 'text',
                                structure: parsed.structure,
                                path: path,
                                index: index + indexOffset
                            })
                    })
                }
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                const childVariables = this.#parseNode(child, attributes.parentVariable ? "" : `${path}${path === "" ? "" : ">"}${child.nodeName}:nth-child(${n})`)
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

import { parseExpressionString, extractDependencies } from "./expressions.js";

/**
 * TextParser is responsible for parsing template strings (e.g. content inside text nodes
 * or attributes) and identifying segments containing double curly braces {{ ... }}
 * or triple curly braces {{{ ... }}}. It parses them into expression AST nodes and
 * extracts variable dependencies.
 */
class TextParser {

    constructor() {}

    /**
     * Parses a string containing template bindings into a list of structure segments
     * (plain text, raw HTML expressions, or standard text expressions) and gathers
     * the variable dependencies.
     *
     * @param {string} text The raw text string to parse.
     * @returns {{ variables: Set<string>, structure: Array<Object> }} An object containing
     * the set of extracted dynamic variable names and the parsed template structure segments.
     */
    parse (text) {
        let values = [];
        let vars = new Set();

        while (text.length > 0) {
            let nextThreeOpen = text.indexOf('{{{');
            let nextTwoOpen = text.indexOf('{{');

            // Find the closest opener
            let openerIdx = -1;
            let openerLen = 0;

            if (nextThreeOpen !== -1 && (nextTwoOpen === -1 || nextThreeOpen <= nextTwoOpen)) {
                openerIdx = nextThreeOpen;
                openerLen = 3;
            } else if (nextTwoOpen !== -1) {
                openerIdx = nextTwoOpen;
                openerLen = 2;
            }

            if (openerIdx === -1) {
                // No more expressions
                values.push({ type: 'txt', value: text });
                break;
            }

            // Push leading text
            if (openerIdx > 0) {
                values.push({ type: 'txt', value: text.substring(0, openerIdx) });
            }

            let closerStr = openerLen === 3 ? '}}}' : '}}';
            let closerIdx = text.indexOf(closerStr, openerIdx + openerLen);

            if (closerIdx === -1) {
                // Unmatched opening bracket - treat it as plain text and continue
                values.push({ type: 'txt', value: text.substring(openerIdx, openerIdx + openerLen) });
                text = text.substring(openerIdx + openerLen);
            } else {
                let inner = text.substring(openerIdx + openerLen, closerIdx).trim();
                try {
                    let ast = parseExpressionString(inner);
                    let deps = extractDependencies(ast);

                    deps.forEach(v => vars.add(v));

                    if (openerLen === 3) {
                        // Raw variable
                        const rawNode = { type: 'raw', name: inner };
                        Object.defineProperty(rawNode, 'ast', {
                            value: ast,
                            enumerable: false,
                            writable: true,
                            configurable: true
                        });
                        values.push(rawNode);
                    } else {
                        // Standard expression
                        const exprNode = { type: 'expression' };
                        Object.defineProperty(exprNode, 'ast', {
                            value: ast,
                            enumerable: false,
                            writable: true,
                            configurable: true
                        });
                        values.push(exprNode);
                    }
                } catch (e) {
                    throw new Error(`Error parsing "${inner}": ${e.message}`);
                }
                text = text.substring(closerIdx + openerLen);
            }
        }
        return { variables: vars, structure: values };
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
     * @param {Node} node The DOM element node to parse.
     * @param {string} path The current DOM selector path.
     * @returns {Object} An object containing parsed attribute variables and any parent loop variable structure.
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
     * @param {Node} node The DOM element node to parse.
     * @param {string} path The current DOM selector path.
     * @returns {Map<string, Array<Object>>} A map of variable names to their bound DOM node details.
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
                    const result = this.#handleRawSegments(child, node, parsed, variables, path, attributes, children, index, indexOffset, n);
                    indexOffset = result.indexOffset;
                    n = result.n;
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
     * Handle the splitting of a text node when it contains raw variable segments.
     *
     * @param {Text} child The raw text node containing unescaped HTML template bindings.
     * @param {Node} node The parent element node.
     * @param {Object} parsed The parsed structure and variables from TextParser.
     * @param {Map} variables The map tracking accumulated dynamic variable bindings.
     * @param {string} path The current DOM selector path.
     * @param {Object} attributes Parsed attributes and loop information of the parent node.
     * @param {Array<Node>} children The child DOM nodes array.
     * @param {number} index Index of the current child.
     * @param {number} indexOffset Accumulated offset of DOM children modifications.
     * @param {number} n The child index iterator.
     * @returns {{ indexOffset: number, n: number }} Updated indexOffset and n values.
     */
    #handleRawSegments(child, node, parsed, variables, path, attributes, children, index, indexOffset, n) {
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
                if (s.ast) {
                    const deps = extractDependencies(s.ast);
                    deps.forEach(v => current.variables.add(v));
                }
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

        return { indexOffset, n };
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

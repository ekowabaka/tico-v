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
        this.#manipulators.forEach(manipulator => manipulator.set !== undefined && manipulator.set(name, target[name]))
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
            const updateHandler = new ArrayUpdateHandler(this.#variables.get(name), this.#manipulators.get(name));
            return new Proxy(target[name], updateHandler);
        } else if (typeof target[name] === 'object') {
            return target[name];
        } else {
            return target[name];
        }
    }

    set(target, name, value) {
        target[name] = value;
        this.run(target, name);
        return true;
    }

    run(target, name) {
        if (!this.#manipulators.has(name)) {
            return;
        }
        this.#manipulators.get(name).forEach(manipulator => {
            let manipulatedNode = undefined;
            if (this.#node) {
                const baseNode = manipulator.variables.path === "" ? this.#node : this.#node.querySelector(manipulator.variables.path);
                if (manipulator.variables.type === "text") {
                    manipulatedNode = baseNode.childNodes[manipulator.variables.index];
                } else if (manipulator.variables.type === "attribute") {
                    manipulatedNode = baseNode.getAttributeNode(manipulator.variables.name);
                } else {
                    manipulatedNode = baseNode;
                }
            }
            manipulator.update(target, manipulatedNode)
        });
    }
}

export {UpdateHandler, ArrayUpdateHandler}

let domparser = new DomParser();

function UpdateHandler(manipulators) {
    this.get = function (target, name) {
        return target[name];
    }

    this.set = function (target, name, value) {
        target[name] = value;
        manipulators.forEach(manipulator => manipulator.update(target));
    }
}

/**
 * Bind a view to a set of variables
 */
function bind(bindingDetails) {
    let baseNode = typeof bindingDetails.node === 'string' 
        ? document.querySelector(bindingDetails.node) 
        : bindingDetails.node;

    let variables = domparser.parse(baseNode);
    let manipulators = [];
    variables.forEach((nodes, variable) => {
        nodes.forEach(node => manipulators.push(DomManipulators.create(node)))
    });

    return new Proxy({}, new UpdateHandler(manipulators));
}

let simpleview = {
    bind: bind
}


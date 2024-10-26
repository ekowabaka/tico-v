/**
 * manipulators.js
 * 
 * Tico-V directly manipulates the DOM with the manipulators defined in this file. Each of these manipulators can
 * be attached to particular tico-v elements within the DOM. Whenever data changes, manipulators are called to update
 * the DOM.
 */

/**
 * A utility function for rendering a text string when given a the parsed tree genereted by the text parser.
 * 
 * @param {Array} structure 
 * @param {Object} data 
 */
function renderText(structure, data) {
  return structure.reduce((string, segment) => {
    switch (segment.type) {
      case 'var': return string + data[segment.name];
      case 'txt': return string + segment.value;
      case 'cond': return string + (data[segment.var1] ? data[segment.var1] : data[segment.var2]);
      case 'condstr': return string + (data[segment.var1] ? segment.var2 : "");
      case 'condstrelse': return string + (data[segment.var1] ? segment.var2 : segment.var3);
    }
  }, "");
}

/**
 * Responsible for manipulating text nodes in the DOM.
 * 
 * @param {Object} entry 
 */
class TextNodeManipulator {

  #entry

  constructor(entry) {
    this.#entry = entry
  }

  update(data, node) {
    (node || this.#entry.node).textContent = renderText(this.#entry.structure, data)
  }
}


/**
 * Responsible for manipulating the values of attributes on DOM elements.
 * 
 * @param {Object} entry 
 */
class AttributeManipulator {
  #entry

  constructor(entry) {
    this.#entry = entry
  }

  update(data, node) {
    (node || this.#entry.node).value = renderText(this.#entry.structure, data)
  }
}

class SetManipulator {
  #entry

  constructor(entry) {
    this.#entry = entry
  }

  update(data, node) {
    const final = node || this.#entry.node
    if (data[this.#entry.name]) {
      final.setAttribute(this.#entry.attribute, this.#entry.attribute);
    } else if (final.hasAttribute(this.#entry.attribute)) {
      final.removeAttribute(this.#entry.attribute)
    }
  }
}

/**
 * Responsible for showing or hiding nodes based on the data passed.
 * 
 * @param {Object} entry 
 * @param {boolean} invert 
 */
class TruthAttributeManipulator {

  #entry
  #invert

  constructor(entry, invert) {
    this.#entry = entry
    this.#invert = invert
  }

  update(data, node) {
    const final = node || this.#entry.node
    if ((data[this.#entry.name] && !this.#invert) || (!data[this.#entry.name] && this.#invert)) {
      final.setAttribute('hidden', 'hidden');
    } else if (fina.hasAttribute('hidden')) {
      final.removeAttribute('hidden');
    }
  }
}

class ForeachManipulator {

  #entry
  #manipulators

  constructor(entry, bindingDetails) {
    this.#entry = entry
    this.#manipulators = DomManipulators.create(entry.variables, bindingDetails)
    this.#entry.manipulators = this.#manipulators
  }

  #dispatchEvents(nodes, data) {
    const event = new Event("tv-update");
    event.detail = {nodes: nodes.filter(x => x.nodeType !== Node.TEXT_NODE || x.nodeValue.trim() !== ""), data: data}
    this.#entry.parent.dispatchEvent(event)
  }

  update (data) {
    data = data[this.#entry.name];
    this.#entry.parent.innerHTML = "";
    if (!Array.isArray(data)) {
      return;
    }
    for (let row of data) {
      const newNodes = []
      this.#manipulators.forEach(manipulator => manipulator.update(row))
      this.#entry.template.forEach(x => {
        const newNode = x.cloneNode(true)
        newNodes.push(newNode)
        this.#entry.parent.appendChild(newNode)
      });
      this.#dispatchEvents(newNodes, row)
    }
  }

  set (key, data) {
    const newNodes = []
    this.#manipulators.forEach(manipulator => manipulator.update(data))

    this.#entry.template.forEach((x, offset) => {
      const newNode = x.cloneNode(true)
      newNodes.push(newNode);
      if (key * this.#entry.template.length + offset === this.#entry.parent.childNodes.length) {
        this.#entry.parent.appendChild(newNode);
      } else {
        this.#entry.parent.replaceChild(newNode, this.#entry.parent.childNodes[key * this.#entry.template.length + offset])
      }
    });
    this.#dispatchEvents(newNodes, data);
  }
}

/**
 * A factory for creating manipulators based on the type of the entry.
 */
const DomManipulators = {
  create: function (variables, bindingDetails) {
    let manipulators = [];
    let manipulator;

    variables.forEach(variable => {
      variable.forEach(entry => {
        switch (entry.type) {
          case 'text':
            manipulator = new TextNodeManipulator(entry)
            break;
          case 'attribute':
            manipulator = new AttributeManipulator(entry)
            break;
          case 'truth':
            manipulator = new TruthAttributeManipulator(entry, false)
            break;
          case 'not-truth':
            manipulator = new TruthAttributeManipulator(entry, true)
            break;
          case 'foreach':
            manipulator = new ForeachManipulator(entry, bindingDetails)
            break;
          case 'set':
            manipulator = new SetManipulator(entry)
            break
          default: throw `Unknown type ${entry.type}`
        }
        manipulator.variables = entry;
        manipulators.push(manipulator);
      });
    });

    return manipulators;
  }
}

export {DomManipulators}

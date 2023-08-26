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
function TextNodeManipulator(entry) {
  this.update = function (data, node) {
    let final = node || entry.node;
    final.textContent = renderText(entry.structure, data)
  }
}


/**
 * Responsible for manipulating the values of attributes on DOM elements.
 * 
 * @param {Object} entry 
 */
function AttributeManipulator(entry) {
  this.update = function (data, node) {
    let final = node || entry.node;
    final.value = renderText(entry.structure, data);
  }
}

/**
 * Responsible for showing or hiding nodes based on the data passed.
 * 
 * @param {Object} entry 
 * @param {boolean} invert 
 */
function TruthAttrubuteManipulator(entry, invert) {

  this.update = function (data, node) {
    let final = node || entry.node;
    if ((data[entry.name] && !invert) || (!data[entry.name] && invert)) {
      final.style.display = entry.display;
    } else {
      final.style.display = 'none';
    }
  }
}

/**
 * Responsible for rendering repitions for array based data.
 * 
 * @param {Object} entry 
 */
function ForeachManipulator(entry, bindingDetails) {

  function dispatchEvents(nodes, data) {
    const event = new Event("tv-update");
    event.detail = {nodes: nodes.filter(x => x.nodeType != Node.TEXT_NODE || x.nodeValue.trim() != ""), data: data}
    entry.parent.dispatchEvent(event)
  }

  let manipulators = DomManipulators.create(entry.variables);
  entry.manipulators = manipulators;

  this.update = function (data) {
    data = data[entry.name];
    entry.parent.innerHTML = "";
    if (!Array.isArray(data)) {
      return;
    }
    for (let row of data) {
      const newNodes = [];
      manipulators.forEach(manipulator => manipulator.update(row));
      entry.template.forEach(x => {
        const newNode = x.cloneNode(true);
        newNodes.push(newNode);
        entry.parent.appendChild(newNode);
      });
      dispatchEvents(newNodes, row);
    }
  }

  this.set = function (key, data) {
    const newNodes = [];
    manipulators.forEach(manipulator => manipulator.update(data));

    entry.template.forEach((x, offset) => {
      const newNode = x.cloneNode(true);
      newNodes.push(newNode);
      if (key * entry.template.length + offset === entry.parent.childNodes.length) {
        entry.parent.appendChild(newNode);
      } else {
        entry.parent.replaceChild(newNode, entry.parent.childNodes[key * entry.template.length + offset]);
      }
    });
    dispatchEvents(newNodes, data);

    entry.parent.dispatchEvent
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
            manipulator = new TextNodeManipulator(entry);
            break;
          case 'attribute':
            manipulator = new AttributeManipulator(entry);
            break;
          case 'truth':
            manipulator = new TruthAttrubuteManipulator(entry, false);
            break;
          case 'not-truth':
            manipulator = new TruthAttrubuteManipulator(entry, true);
            break;
          case 'foreach':
            manipulator = new ForeachManipulator(entry, bindingDetails);
            break;
          default: throw `Unknown type ${entry.type}`
        }
        manipulator.variables = entry;
        manipulators.push(manipulator);
      });
    });

    return manipulators;
  }
}
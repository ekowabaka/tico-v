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
function ForeachManipulator(entry) {

  let manipulators = DomManipulators.create(entry.variables);
  entry.manipulators = manipulators;

  function runCallback(node) {
    if(entry.callback) {
      entry.callback(node);
    }
  }

  function setupEvents(node) {
    entry.events.forEach(event => {
      if (event.path) {
        node.querySelector(event.path).addEventListener(event.name, event.callback);
      } else {
        node.addEventListener(event.name, event.callback);
      }
    })
  }

  this.update = function (data) {
    data = data[entry.name];
    entry.parent.innerHTML = "";
    if (!Array.isArray(data)) return;
    for (let row of data) {
      manipulators.forEach(manipulator => manipulator.update(row));
      let newNode = entry.template.cloneNode(true);
      setupEvents(newNode);
      entry.parent.appendChild(newNode);
      runCallback(newNode);
    }
  }

  this.set = function (key, data) {
    manipulators.forEach(manipulator => manipulator.update(data));
    let newNode = entry.template.cloneNode(true);
    setupEvents(newNode);
    if (key == entry.parent.children.length) {
      entry.parent.appendChild(newNode);
    } else {
      entry.parent.replaceChild(newNode, entry.parent.children[key]);
    }
    runCallback(newNode);
  }
}

/**
 * A factory for creating manipulators based on the type of the entry.
 */
const DomManipulators = {
  create: function (variables) {

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
            manipulator = new ForeachManipulator(entry);
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
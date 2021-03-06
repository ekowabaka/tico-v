/**
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

function TextNodeManipulator(entry) {

  this.update = function (data, node) {
    let final = node || entry.node;
    final.textContent = renderText(entry.structure, data)
  }
}

function AttributeManipulator(entry) {
  this.update = function (data, node) {
    let final = node || entry.node;
    final.value = renderText(entry.structure, data);
  }
}

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

function ForeachManipulator(entry) {

  let manipulators = DomManipulators.create(entry.variables);
  entry.manipulators = manipulators;

  function runCallback(node) {
    if(entry.callback) {
      entry.callback(node);
    }
  }

  this.update = function (data) {
    data = data[entry.name];
    entry.parent.innerHTML = "";
    if (!Array.isArray(data)) return;
    for (let row of data) {
      manipulators.forEach(manipulator => manipulator.update(row));
      let newNode = entry.template.cloneNode(true);
      entry.parent.appendChild(newNode);
      runCallback(newNode);
    }
  }

  this.set = function (key, data) {
    manipulators.forEach(manipulator => manipulator.update(data));
    let newNode = entry.template.cloneNode(true);
    if (key == entry.parent.children.length) {
      entry.parent.appendChild(newNode);
    } else {
      entry.parent.replaceChild(newNode, entry.parent.children[key]);
    }
    runCallback(newNode);
  }
}

/**
 * Manipulate the DOM
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
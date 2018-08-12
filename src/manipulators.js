function renderText(structure, data) {
    return structure.reduce((string, segment) => {
        switch(segment.type) {
          case 'var': return string + data[segment.name];
          case 'txt': return string + segment.value;
          case 'cond': return string + (data[segment.var1] ? data[segment.var1] : data[segment.var2]);
          case 'condstr': return string + (data[segment.var1] ? segment.var2 : "");
          case 'condstrelse': return string + (data[segment.var1] ? segment.var2 : segment.var3);
        }
      }, "");        
}

function TextNodeManipulator(node) {

    this.update = function(data) {
        node.node.textContent = renderText(node.structure, data)
    }
}

function AttributeManipulator(node) {
    this.update = function(data) {
        node.node.value = renderText(node.structure, data);
    }
}

function TruthAttrubuteManipulator(node, invert) {
    this.update = function(data) {
        if((data[node.name] && !invert) || (!data[node.name] && invert)) {
            node.node.style.display = node.display;
        } else {
            node.node.style.display = 'none';
        }
    }
}

const DomManipulators = {
    create : function(node) {
        switch(node.type) {
            case 'text': return new TextNodeManipulator(node);
            case 'attribute': return new AttributeManipulator(node);
            case 'truth': return new TruthAttrubuteManipulator(node, false);
            case 'not-truth': return new TruthAttrubuteManipulator(node, true);
            default: throw `Unknown type ${node.type}`
        }
    }
}
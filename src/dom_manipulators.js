function TextNodeManipulator(node) {

    function render(structure, data) {
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

    this.update = function(data) {
        node.node.textContent = render(node.structure, data)
    }
}

const DomManipulators = {
    create : function(node) {
        switch(node.type) {
            case 'text': return new TextNodeManipulator(node)
        }
    }
}
import { DomParser } from "./parsers.js";
import { DomManipulators } from "./manipulators.js";
import { UpdateHandler } from "./update_handlers.js";


/**
 * A view contains the dom elements with associated tico-v tags that can be bound to data items.
 */
class View {

  #dataProxy
  #variables
  #manipulators;

  /**
   * Create a new Tico View
   * @param {*} variables 
   * @param {*} manipulators
   */
  constructor(variables, manipulators) {
    this.#dataProxy = new Proxy({}, new UpdateHandler(variables, manipulators))
    this.#variables = variables;
    this.#manipulators = manipulators;
  }

  /**
   * Setter for the data variable.
   * @param newData
   */
  set data(newData) {
    let updateHandler = new UpdateHandler(this.#variables, this.#manipulators);
    this.#dataProxy = new Proxy(newData, updateHandler);
    updateHandler.run(newData);
  }

  /**
   * Getter for the data variable.
   * @returns {*}
   */
  get data() {
    return this.#dataProxy;
  }
}

/**
 * Bind a view to a mapping of its internal variables.
 */
function bind(template) {
  const templateNode = typeof template === 'string' ? document.querySelector(template) : template;
  if (templateNode) {
    const domparser = new DomParser();
    const variables = domparser.parse(templateNode);
    const manipulators = DomManipulators.create(variables); 
    return new View(variables, manipulators);
  } else {
    throw new Error("Could not find template node");
  }
}

export {bind as tv};
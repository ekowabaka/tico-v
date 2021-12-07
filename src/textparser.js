function TextParser() {
  let regexes = {
    variable: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*}}`, 'i'),
    condstr: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*}}`, 'i'),
    condstrelse: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*"([^"]*)"\\s*:\\s*"([^"]*)"\\s*}}`, 'i'),
    cond: new RegExp(`{{\\s*([a-z][a-z0-9_]*)\\s*\\?\\s*([^"]*)\\s*}}`, 'i'),
    text: new RegExp(`{{`, 'i')
  }

  /**
   * Push the leading text from a variable match unto the parsed list
   * 
   * @param {string} text 
   * @param {*} match 
   * @param {Array} parsed 
   */
  function pushLeadingText(text, match, parsed) {
    if (match.index > 0) {
      parsed.push({ type: 'txt', value: text.substr(0, match.index) });
    }
  }

  this.parse = function (text) {
    let values = [];
    let vars = new Set();
    let order = ['variable', 'condstrelse', 'condstr', 'cond', 'text'];
    let index = 0;
    let lastIndex = undefined;

    // Break the text up into specific identified chunks
    while (text.length > 0) {
      let match = null;
      if (lastIndex !== undefined && lastIndex === index) {
        throw `Error parsing ${text}`
      }
      lastIndex = index;

      // Loop through the regexes in the order specified
      for (let i in order) {
        if (text.length === 0) break;
        match = regexes[order[i]].exec(text);
        if (match) {
          index = match.index + match[0].length;
          switch (order[i]) {
            case 'variable':
              pushLeadingText(text, match, values);
              values.push({ type: 'var', name: match[1] });
              vars.add(match[1]);
              text = text.substr(index, text.length - index);
              break;
            case 'condstr':
            case 'cond':
              pushLeadingText(text, match, values);
              values.push({ type: order[i], var1: match[1], var2: match[2] });
              vars.add(match[1]);
              text = text.substr(index, text.length - index);
              if (order[i] === 'cond') vars.add(match[2]);
              break;
            case 'condstrelse':
              pushLeadingText(text, match, values);
              values.push({ type: 'condstrelse', var1: match[1], var2: match[2], var3: match[3] });
              vars.add(match[1]);
              text = text.substr(index, text.length - index);
              break;
            case 'text':
              pushLeadingText(text, match, values);
              text = text.substr(match.index, text.length - match.index);
              break;
          }
        }
        if (match) break;
      }

      // If none of the regexes match return the remaining part of the string as is
      if (match === null && text.length > 0) {
        values.push({ type: 'txt', value: text });
        break;
      }
    }
    return { variables: vars, structure: values }
  }
}
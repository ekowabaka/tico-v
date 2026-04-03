/**
 * @jest-environment jsdom
 */

import {DomParser} from "../src/parsers.js";
import {UpdateHandler} from "../src/update_handlers.js";
import {DomManipulators} from "../src/manipulators.js";

let parser
const layout = `<!DOCTYPE html>
    <html>
        <body>
            <div id="wrapper">%s</div>
        </body>
    </html>`

beforeAll(() => {
    parser = new DomParser()
})

test("render raw html", () => {
    document.body.innerHTML = layout.replace('%s',
        `<div id="target">Hello {{{ name }}}!</div>`
    )
    const wrapper = document.body.querySelector('#wrapper')
    const variables = parser.parse(wrapper)
    
    // In tico-v, we normally use a Proxy with UpdateHandler.
    const data = { name: "<b>World</b>" }
    const manipulators = DomManipulators.create(variables)
    const handler = new UpdateHandler(variables, manipulators, wrapper)
    const proxy = new Proxy(data, handler)
    
    // Initial content of the text area was "Hello {{{ name }}}!"
    // But DomParser should have split it.
    const target = document.querySelector('#target')
    
    // Initial update
    handler.run(proxy, 'name')
    
    expect(target.innerHTML).toContain('Hello ')
    expect(target.innerHTML).toContain('<b>World</b>')
    expect(target.innerHTML).toContain('!')
    
    // Verify it's actually a DOM element, not escaped text
    const bold = target.querySelector('b')
    expect(bold).not.toBeNull()
    expect(bold.textContent).toBe('World')
    
    // Update reactivity
    proxy.name = "<i>Galaxy</i>"
    expect(target.querySelector('b')).toBeNull()
    const italic = target.querySelector('i')
    expect(italic).not.toBeNull()
    expect(italic.textContent).toBe('Galaxy')
})

test("render multiple raw html and mixed content", () => {
    document.body.innerHTML = layout.replace('%s',
        `<div id="target">{{ greeting }} {{{ raw1 }}} mid {{{ raw2 }}} {{ suffix }}</div>`
    )
    const wrapper = document.body.querySelector('#wrapper')
    const variables = parser.parse(wrapper)
    
    const data = { greeting: "Hi", raw1: "<b>A</b>", raw2: "<i>B</i>", suffix: "!" }
    const manipulators = DomManipulators.create(variables)
    const handler = new UpdateHandler(variables, manipulators, wrapper)
    const proxy = new Proxy(data, handler)
    
    handler.run(proxy, 'greeting')
    handler.run(proxy, 'raw1')
    handler.run(proxy, 'raw2')
    handler.run(proxy, 'suffix')
    
    const target = document.querySelector('#target')
    expect(target.textContent).toContain('Hi')
    expect(target.querySelector('b').textContent).toBe('A')
    expect(target.textContent).toContain(' mid ')
    expect(target.querySelector('i').textContent).toBe('B')
    expect(target.textContent).toContain('!')
})

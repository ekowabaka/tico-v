/**
 * @jest-environment jsdom
 */

import {DomParser} from "../src/parsers.js";


let parser
const layout = `<!DOCTYPE html>
    <html>
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper">%s</div>
        </body>
    </html>`

const variable = {
    node: expect.any(Node),
    type: expect.stringMatching(/attribute|text/),
    structure: expect.any(Array),
    path: expect.any(String)
}

const attribute = {
    name: expect.any(String),
    type: 'attribute',
    node: expect.any(Attr)
}

const text = {
    node: expect.any(Text),
    type: 'text',
    index: expect.any(Number),
}

beforeAll(() => {
    parser = new DomParser()
})

test("parse variables", () => {
    document.body.innerHTML = layout.replace('%s',
        `<div tv-value-title="This is {{another}}" tv-value-class="{{something}}">{{ another  }}</div>`
    )
    const variables = parser.parse(document.body.querySelector('#wrapper'))
    expect(variables.size).toBe(2)
    expect(variables.has('something')).toEqual(true)
    expect(variables.has('another')).toEqual(true)

    const somethings = variables.get('something')
    expect(somethings).toHaveLength(1)
    const something = somethings[0]
    expect(something).toMatchObject(variable)
    expect(something).toMatchObject(attribute)
    expect(something.structure).toEqual([{ type: 'var', name: 'something' }])

    const another = variables.get('another')
    expect(another).toHaveLength(2)
    another.forEach(x => expect(x).toMatchObject(variable))
    expect(another[0]).toMatchObject(attribute)
    expect(another[1]).toMatchObject(text)
    expect(another[0].structure).toEqual([
        { type: 'txt', value: 'This is ' },
        { type: 'var', name: 'another' }
    ])
})

test("parse conditions", () => {
    document.body.innerHTML = layout.replace(
        '%s', `<div tv-value-title="This is {{ifthis?that}}">`
    )
    const variables = parser.parse(document.body.querySelector('#wrapper'))
    expect(variables.size).toBe(2)
    expect(variables.has('ifthis')).toEqual(true)
    expect(variables.has('that')).toEqual(true)

    const ifthis = variables.get('ifthis')
    // expect(ifthis[0].path).toEqual('DIV:nth-child(1)')
    expect(ifthis[0]).toMatchObject(variable)
    expect(ifthis[0]).toMatchObject(attribute)
    expect(ifthis[0].structure).toEqual([
        { type: 'txt', value: 'This is ' },
        { type: 'cond', var1: 'ifthis', var2: 'that' }
    ])

    const that = variables.get('that')
    expect(that[0].structure).toEqual([
        { type: 'txt', value: 'This is ' },
        { type: 'cond', var1: 'ifthis', var2: 'that' }
    ])
})

test("parse spaced conditions", () => {
    document.body.innerHTML = layout.replace(
        '%s', `<div tv-value-title="This is {{ ifthis ?  that  }}">`
    )
    const variables = parser.parse(document.body.querySelector('#wrapper'))
    // console.log(variables)
    expect(variables.size).toBe(2)
    expect(variables.has('ifthis')).toEqual(true)
    expect(variables.has('that')).toEqual(true)
})

test("parse condition string", () => {
    document.body.innerHTML = layout.replace(
        '%s', `<div tv-value-title='This is {{ ifthis ?  "some string"  }}'>`
    )
    const variables = parser.parse(document.body.querySelector('#wrapper'))
    expect(variables.size).toEqual(1)
    const ifthis = variables.get('ifthis')
    expect(ifthis[0]).toMatchObject(variable)
    expect(ifthis[0]).toMatchObject(attribute)
    expect(ifthis[0].structure).toEqual([
        { type: 'txt', value: 'This is ' },
        { type: 'condstr', var1: 'ifthis', var2: 'some string' }
    ])
})

test("parse condition string else", () => {
    document.body.innerHTML = layout.replace(
        '%s', `<div tv-value-title='This is {{ ifthis ?  "some string" : "other string"  }}'>`
    )
    const variables = parser.parse(document.body.querySelector('#wrapper'))
    expect(variables.size).toEqual(1)
    const ifthis = variables.get('ifthis')
    expect(ifthis[0]).toMatchObject(variable)
    expect(ifthis[0]).toMatchObject(attribute)
    expect(ifthis[0].structure).toEqual([
        { type: 'txt', value: 'This is ' },
        {
            type: 'condstrelse',
            var1: 'ifthis',
            var2: 'some string',
            var3: 'other string'
        }
    ])
})


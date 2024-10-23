/**
 * @jest-environment jsdom
 */

import {bind} from "../src/ticoview.js";

let view, wrapper

beforeEach(() => {
    document.body.innerHTML = `<html>  
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper">
                <div tv-foreach="items" id="list">
                    <p tv-value-id="{{id}}">{{text}}</p>
                </div>
            </div>
        </body>
    </html>`

    view = bind(document.getElementById('wrapper'))
    view.data = {
        items: [
            {id: 1, text: "Hello"}, {id: 2, text: "World"},
            {id: 3, text: "Here"}, {id: 4, text: "We"}, {id: 5, text: "Come"}
        ]
    }
    wrapper = document.getElementById('list')
})

test("foreach arrays on nodes", () => {
    const items = [
        {id: '1', text: "Hello"}, {id: '2', text: "World"},
        {id: '3', text: "Here"}, {id: '4', text: "We"}, {id: '5', text: "Come"}
    ]

    expect(wrapper.children.length).toEqual(5)

    for (let i = 0; i < items.length; i++) {
        expect(wrapper.children[i].id).toEqual(items[i].id)
        expect(wrapper.children[i].innerHTML).toEqual(items[i].text)
        expect(wrapper.children[i].tagName).toEqual('P')
    }

    for (const item of view.data.items) {
        item.id += " modified"
        item.text += " modified"
    }

    for (let i = 0; i < items.length; i++) {
        expect(wrapper.children[i].id).toEqual(items[i].id + ' modified')
        expect(wrapper.children[i].innerHTML).toEqual(items[i].text + ' modified')
    }
})

test("replace view array", () => {
    const items = [
        {id: '10', text: "Hello World!"}, {id: '29', text: "Replaced"}
    ]
    view.data.items = items
    expect(wrapper.children.length).toEqual(2)

    for (let i = 0; i < items.length; i++) {
        expect(wrapper.children[i].id).toEqual(items[i].id )
        expect(wrapper.children[i].innerHTML).toEqual(items[i].text)
    }
})

test("add to view array", () => {
    const items = [
        {id: '1', text: "One"}, {id: '2', text: "Two"},
    ]
    view.data.items = items
    expect(wrapper.children.length).toEqual(2)
    view.data.items.push({id: '3', text: "Three"})
    expect(wrapper.children.length).toEqual(3)
    expect(wrapper.children[2].innerHTML).toEqual("Three")
    expect(wrapper.children[2].id).toEqual("3")
})


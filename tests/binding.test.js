/**
 * @jest-environment jsdom
 */

import { tv } from '../src/ticoview'

test("binds data to a dom element", () => {
    document.body.innerHTML = `
    <!DOCTYPE html>
    <html>
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper"><div>{{bound}}</div></div>
        </body>
    </html>`

    const view = tv(document.getElementById('wrapper'))
    view.data = {bound: "Some Data!"}
    expect(document.body.querySelector("#wrapper > div").innerHTML).toEqual("Some Data!")

    view.data.bound = "Changed!"
    expect(document.body.querySelector("#wrapper > div").innerHTML).toEqual("Changed!")
})

test("binds attributes to a dom element", () => {
    document.body.innerHTML = `
    <!DOCTYPE html>
    <html>  
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper"><div tv-value-attrib="{{value}}">Should have attribute values</div></div>
        </body>
    </html>`

    const view = tv(document.getElementById('wrapper'))
    view.data = {value: "Some Data!"}

    expect(document.body.querySelector("#wrapper > div").hasAttribute('attrib')).toEqual(true);
    expect(document.body.querySelector("#wrapper > div").getAttribute('attrib')).toEqual("Some Data!");

    view.data.value = "Changed!"
    expect(document.body.querySelector("#wrapper > div").getAttribute("attrib")).toEqual("Changed!")
})

test("shows or hides dom nodes", () => {
    document.body.innerHTML = `<html>  
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper"><div tv-true="shown">Should have attribute values</div></div>
        </body>
    </html>`

    const view = tv(document.getElementById('wrapper'))
    view.data = {shown: false}
    expect(document.body.querySelector("#wrapper > div").getAttribute("style")).toEqual("display: none;");
    view.data = {shown: true}
    expect(document.body.querySelector("#wrapper > div").getAttribute("style")).toEqual("");
})

test("inversely shows or hides dom nodes", () => {
    document.body.innerHTML = `<html>  
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper"><div tv-not-true="inverseShown">Should have attribute values</div></div>
        </body>
    </html>`

    const view = tv(document.getElementById('wrapper'))
    view.data = {inverseShown: false}
    expect(document.body.querySelector("#wrapper > div").getAttribute("style")).toEqual(null);
    view.data = {inverseShown: true}
    expect(document.body.querySelector("#wrapper > div").getAttribute("style")).toEqual("display: none;");
})

test("foreach arrays on nodes", () => {
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

    const view = tv(document.getElementById('wrapper'))
    view.data = {
        items: [
            {id: 1, text: "Hello"}, {id: 2, text: "World"},
            {id: 3, text: "Here"}, {id: 4, text: "We"}, {id: 5, text: "Come"}
        ]
    }
    const wrapper = document.getElementById('list')
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
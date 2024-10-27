/**
 * @jest-environment jsdom
 */

import {bind} from '../src/ticoview'

test("binds data to a dom element", () => {
    document.body.innerHTML = `
    <!DOCTYPE html>
    <html>
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper">{{bound}}</div>
        </body>
    </html>`

    const view = bind(document.getElementById('wrapper'))
    view.data = {bound: "Some Data!"}
    expect(document.body.querySelector("#wrapper").innerHTML).toEqual("Some Data!")

    view.data.bound = "Changed!"
    expect(document.body.querySelector("#wrapper").innerHTML).toEqual("Changed!")
})

test("binds data to a child dom element", () => {
    document.body.innerHTML = `
    <!DOCTYPE html>
    <html>
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper"><div>{{bound}}</div></div>
        </body>
    </html>`

    const view = bind(document.getElementById('wrapper'))
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

    const view = bind(document.getElementById('wrapper'))
    view.data = {value: "Some Data!"}

    expect(document.body.querySelector("#wrapper > div").hasAttribute('attrib')).toEqual(true)
    expect(document.body.querySelector("#wrapper > div").getAttribute('attrib')).toEqual("Some Data!")

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

    const view = bind(document.getElementById('wrapper'))
    view.data = {shown: false}
    expect(document.body.querySelector("#wrapper > div").hidden).toEqual(true)
    view.data = {shown: true}
    expect(document.body.querySelector("#wrapper > div").hidden).toEqual(false)
})

test("inversely shows or hides dom nodes", () => {
    document.body.innerHTML = `<html>  
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper"><div tv-not-true="inverseShown">Should have attribute values</div></div>
        </body>
    </html>`

    const view = bind(document.getElementById('wrapper'))
    view.data = {inverseShown: false}
    expect(document.body.querySelector("#wrapper > div").hidden).toEqual(false)
    view.data = {inverseShown: true}
    expect(document.body.querySelector("#wrapper > div").hidden).toEqual(true)
})

test("binding over foreach items", () => {
    document.body.innerHTML = `<html>
        <head><title>A test page</title></head>
        <body>
            <ul tv-value-class="{{aclass}}" tv-foreach="items" id="wrapper">
                <li>{{description}}</li>
            </ul>
        </body>
    </html>`

    const view = bind(document.getElementById('wrapper'))
    view.data = {
        items: [
            {'description': 'First item'},
            {'description': 'Second item'},
            {'description': 'Third item'},
        ],
        aclass: 'anewclass'
    }

    expect(document.body.querySelector("#wrapper").getAttribute("class")).toEqual("anewclass");
    expect(document.body.querySelector("#wrapper").children).toHaveLength(3)
})

test("repeated value as attribute and node", () => {
    document.body.innerHTML = `
    <html>
        <head></head>
        <body>
            <div id="wrapper">
                    <span>{{description}}</span>
                    <span>{{description}}</span>
            </div>
        </body>
    </html>`
    const view = bind(document.getElementById('wrapper'))
    view.data = {
        description: 'descriptionz'
    }

    document.body.querySelectorAll("#wrapper div").forEach(x => {
        expect(x.innerHTML).toEqual("descriptionz")
    })
})

test("set to add boolean attributes to nodes", () => {
    document.body.innerHTML = `
    <html>
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper"><input type="checkbox" tv-set-checked="show" /></div>
        </body>
    </html>`
    const view = bind(document.getElementById('wrapper'))
    view.data = {
        show: true
    }

    expect(document.body.querySelector("#wrapper > input").hasAttribute('checked')).toEqual(true)
    expect(document.body.querySelector("#wrapper > input").getAttribute('checked')).toEqual('checked')

    view.data.show = false
    expect(document.body.querySelector("#wrapper > input").hasAttribute('checked')).toEqual(false)
})

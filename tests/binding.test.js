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

    const view = bind(document.getElementById('wrapper'))
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

    const view = bind(document.getElementById('wrapper'))
    view.data = {inverseShown: false}
    expect(document.body.querySelector("#wrapper > div").getAttribute("style")).toEqual(null);
    view.data = {inverseShown: true}
    expect(document.body.querySelector("#wrapper > div").getAttribute("style")).toEqual("display: none;");
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

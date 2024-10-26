/**
 * @jest-environment jsdom
 */

import {bind} from "../src/ticoview.js";

test("add array and value to foreach element", () => {
    document.body.innerHTML = `<html>  
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper">
                <div tv-foreach="items" id="list" tv-value-class="{{aclass}}">
                    <p tv-value-id="{{id}}">{{text}}</p>
                </div>
            </div>
        </body>
    </html>`
    const view = bind(document.getElementById('wrapper'))
    view.data = {
        items: [
            {id: '1', subitems: "One"}, {id: '2', text: "Two"},
        ],
        aclass: 'some class'
    }
    const div = document.querySelector('#wrapper > div')
    expect(div.children.length).toEqual(2)
    expect(div.hasAttribute('class')).toBeTruthy()
    expect(div.getAttribute('class')).toEqual('some class')
})

test("nested array values", () => {
    document.body.innerHTML = `<html>  
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper">
                <div tv-foreach="items" id="list" tv-value-class="{{aclass}}">
                    <ul tv-value-id="{{id}}" tv-foreach="subitems">
                        <li>{{subitem}}</li>
                    </ul>
                </div>
            </div>
        </body>
    </html>`
    const view = bind(document.getElementById('wrapper'))
    view.data = {
        items: [
            {id: '1', subitems: [
                    {subitem: '1'},
                    {subitem: '2'},
                    {subitem: '3'},
                ]}, {id: '2', subitems: [
                    {subitem: 'one'},
                    {subitem: 'two'},
                    {subitem: 'three'},
                    {subitem: 'four'}
                ]},
        ],
        aclass: 'some class'
    }

    expect(document.body.querySelector("#list").children).toHaveLength(2)
})
/**
 * @jest-environment jsdom
 */

import {bind} from "../src/ticoview.js";

test("set to add boolean attributes to list of nodes", () => {
    document.body.innerHTML = `
    <html>
        <head><title>A test page</title></head>
        <body>
            <ul tv-foreach="checks" id="wrapper">
                <li><input type="checkbox" tv-set-checked="show" /></li>
            </ul>
        </body>
    </html>`
    const view = bind(document.getElementById('wrapper'))
    view.data = {
        checks: [{show: false}, {show: true}, {show: false}, {show: false}, {show: false}],
    }
    const wrapper = document.getElementById('wrapper')
    expect(wrapper.children).toHaveLength(5)
    const states = [false, true, false, false, false]
    for(let i = 0; i < states.length; i++) {
        expect(wrapper.children[i].checked).toEqual(states[i].id)
    }
})

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

test("pushing values into array", () => {
    document.body.innerHTML = `<html>
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper" tv-foreach="interesting">
                <span>{{value}}</span>
            </div>
        </body>
    </html>`
    const view = bind(document.getElementById('wrapper'))
    view.data = {interesting: [{value:'1'},{value: '3'}]}
    view.data.interesting.push({value:'2'})
    console.log(document.body.innerHTML)
})

test("pushing extra values into array", () => {
    document.body.innerHTML = `<html>
        <head><title>A test page</title></head>
        <body>
            <div id="wrapper">
                <div tv-foreach="interesting">
                    <span>{{value}}</span>
                </div>
                <div tv-foreach="second">
                    <span>{{value}}</span>
                </div>
            </div>
        </body>
    </html>`
    const view = bind(document.getElementById('wrapper'))
    view.data = {second: [], interesting: [{value:'1'},{value: '3'}]}
    view.data.interesting.push({value:'2'})
    console.log(document.body.innerHTML)
    view.data.interesting.push({value:'4'})
    console.log(document.body.innerHTML)
})
/**
 * @jest-environment jsdom
 */

import {bind} from "../src/ticoview.js";

test("triggering events after items are added", () => {
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
})
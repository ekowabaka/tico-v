/**
 * @jest-environment jsdom
 */

import { tv } from '../src/ticoview'

test("binds data to a dom tag", () => {
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
})
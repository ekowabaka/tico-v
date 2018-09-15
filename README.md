tiCo-v
====
tiCo-v provides a lightweight solution for templating and one-way data-binding in JavaScript. Built on top of ES6 proxies, tiCo-v provides a very thin layer of code which relies on proxy traps to update DOM elements when bound objects are updated.

Installation
------------
tiCo-v has no dependencies and is quite easy to install. Currently, the only supported package managers are `npm` and `composer`. If you do not use any of these, you can always download the current version of the script and use it directly as you desire.

For `npm` ...

    npm install tico-v

For `composer` ...
    
    composer require ekowabaka/tico-v

You might also consider direct inclusion as follows ...

````html
<script src='assets/tico-v.min.js'></script>
````


## Writing Templates
Templates for tiCo-v are written directly into the HTML markup of the page you. Variables to be replaced by later bindings are written with the mustache/handlebars style variable placeholder (and that's where the similarity ends). In fact, the featureset of tiCo-v is so small it call be summarised with one example.

````html
<div id="profile">
    <div>
        <span id='firstname'>{{firstname}}</span>
        <span id='lastname'>{{lastname}}</span>
    </div>
    <img tv-value-src='{{avater_img?"default-avatar.png"}}' />
    <ul tv-true="updates">
        <li tv-foreach="updates">
            <span>{{time}}</span>
            <span>{{update}}</span>
            <span>This update is {{verified?"":"not"}} verified<span>
        </li>
    </ul>
</div>
````

### Text Substitutions
From the example, we should see that text substitutions are performed with variables specified in curly braces (e.g. ``{{variable}}``). Conditional substitution can be made with the "`?`" operator. So, ``{{variable1 ? variable2}}`` implies, the value of `variable1` will be displayed if it is truthy instead of the value of ``variable2`` which will displayed irrespective of its value. 

Conditional substitutions can also involve literal text such as ``{{truth ? "when true" : "when false"}}``. In this case, the text ``when true`` is substituted if the variable ``truth`` is truthy and ``when false`` is displayed when it's false. For literal substitutions, the second literal to be displayed on a false value can be omitted and it's automatically replaced with an empty string.

### Special tv attributes
Prefixing any attribute with `tv-value-` causes that attribute to be later added with its value parsed for text substitutions. For example adding the attribute `tv-value-src='{{avater_img?"default-avatar.png"}}'` to an `img` tag will cause tiCo-v to add an `src` attribute whose value is based on the evaluation of the substitution `{{avater_img?"default-avatar.png"}}`.

Apart from the 

## Binding Variables
To bind an object to a template such as the one above, we you use:

````js
let view = tv.bind("#profile");
view.data = {
    firstname: "Kofi",
    lastname: "Manu",
    avatar: "09348534ea87e.png",
    updates: [
        {time: "2018-05-06 02:00:00 +005", update: "Something to talk about"},
        {time: "2018-05-06 02:10:00 +005", update: "Another thing to make noise about"},
    ]
}
````

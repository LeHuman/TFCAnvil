const solver = require("javascript-lp-solver");
const lo = require('lodash');

const DEFAULT_ACTIONS = {
    "Light Hit": -3,
    "Medium Hit": -6,
    "Hard Hit": -9,
    "Draw": -15,
    "Punch": 2,
    "Bend": 7,
    "Upset": 13,
    "Shrink": 16,
};

function optimize(actions, target, last) {

    last.forEach(name => {
        target -= actions[name];
    });

    const model = {
        optimize: "count",
        opType: "min",
        constraints: {
            points: { equal: target },
        },
        variables: {},
        ints: {},
    };

    for (let [name, val] of Object.entries(actions)) {
        model.variables[name] = { points: val, count: 1 };
        model.ints[name] = 1;
    }

    const lp = solver.Solve(model);
    const results = {};

    for (const name in model.variables) {
        if (lp[name]) {
            results[name] = Math.round(lp[name]);
        }
    }

    return [results, last];
}

// https://stackoverflow.com/questions/32543936/combination-with-repetition
function combRep(arr, l) {
    if (l === void 0) l = arr.length; // Length of the combinations
    let data = Array(l),             // Used to store state
        results = [];                // Array of results
    (function f(pos, start) {        // Recursive function
        if (pos === l) {                // End reached
            results.push(data.slice());  // Add a copy of data to results
            return;
        }
        for (let i = start; i < arr.length; ++i) {
            data[pos] = arr[i];          // Update data
            f(pos + 1, i);                 // Call f recursively
        }
    })(0, 0);                        // Start at index 0
    return results;                  // Return results
}

function preprocess(actions, target, last) {
    actions = lo.mapKeys(actions, (value, key) => key.toLowerCase());
    last = last.map(v => v.toLowerCase());

    if (last.includes("hit")) {
        const hits = Object.keys(actions).filter(k => k.includes("hit"));
        const combos = combRep(hits, last.filter(v => v === "hit").length);
        const noHitLast = last.filter(v => v !== "hit");
        let results = [];
        let resultSz = [];

        combos.forEach(combo => {
            const result = optimize(actions, target, [...noHitLast, ...combo]);
            resultSz.push(Object.keys(result[0]).length);
            results.push(result);
        });

        const minIndex = resultSz.indexOf(Math.min(...resultSz));
        let [result, rlast] = results[minIndex];
        let finalLast = [];

        last.forEach(name => {
            if (name === "hit") {
                while (rlast.length) {
                    const val = rlast.shift();
                    if (val.includes("hit")) {
                        name = val;
                        break;
                    }
                }
                if (name === "hit") {
                    return [actions, {}, ["Failed"]];
                }
            }
            finalLast.push(name);
        });

        return [actions, result, finalLast];
    } else {
        return [actions, ...optimize(actions, target, last)];
    }
}

function postprocess(actions, target, last) {
    const [processedActions, result, processedLast] = preprocess(actions, target, last);
    actions = lo.pick(processedActions, Object.keys(result));
    const final = [];

    while (Object.keys(result).length) {
        const name = lo.maxBy(Object.keys(actions), k => actions[k]);
        delete actions[name];
        final.push([name, result[name]]);
        delete result[name];
    }

    return [final, processedLast];
}

function printItems(items, actions) {
    items.forEach(item => {
        const [name, target, last] = item;
        const [result, finalLast] = postprocess(actions, target, last);
        const finalItems = result.map(([k, v]) => `${k} x${v}`);
        finalItems.push(...finalLast.map(v => `${v} x1`));
        console.log(`${name} @ ${target} | ${finalItems.join(", ")}`);
    });
}

window.onload = () => {
    const tooltipList = [];
    Array.from(document.getElementsByClassName("info")).forEach((elm) => {
        elm.setAttribute('data-bs-toggle', 'tooltip');
        elm.setAttribute('data-bs-placement', 'auto');
        elm.setAttribute('data-bs-title', elm.parentElement.title);
        elm.parentElement.removeAttribute('title');
        tooltipList.push(new bootstrap.Tooltip(elm));
    });
    // const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    // const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

    const a_actions = document.getElementById("actions_select");
    const a_selected = document.getElementById("actions_text_selected");
    const a_iname = document.getElementById("actions_input_name");
    const a_ivalue = document.getElementById("actions_input_value");
    const c_iname = document.getElementById("calc_input_name");
    const c_itarget = document.getElementById("calc_input_target");
    const a_btn_del = document.getElementById("actions_btn_del");
    const c_btn_action = document.getElementById("action_buttons");
    const c_ul_last = document.getElementById("ul_last_actions");
    const c_btn_clr = document.getElementById("btn_clear_last");
    const l_btn_use = document.getElementById("btn_use_last");
    const l_total = document.getElementById("last_text_total");
    const c_nas = document.getElementById("info_nas");
    const r_select = document.getElementById("result_select");
    const r_group = document.getElementById("result_group");
    const r_clipboard = document.getElementById("btn_clipboard");
    const r_clipboard_tt = new bootstrap.Tooltip(r_clipboard);

    let target_value = NaN;
    let result_string = '';

    function calc_add_last(name, value) {
        let li = document.createElement("li");
        li.className = "list-group-item last_action";
        li.innerText = name;

        c_nas.setAttribute('hidden', '');
        c_ul_last.appendChild(li);
        c_btn_clr.removeAttribute('disabled');
        l_btn_use.className = "btn btn-info";
        l_total.innerText = parseInt(l_total.innerText, 10) + parseInt(value, 10);
    }

    function calc_clear_last() {
        c_btn_clr.setAttribute('disabled', '');
        l_btn_use.className = "btn btn-outline-info";
        c_ul_last.innerHTML = '';
        c_nas.removeAttribute('hidden');
        l_total.innerText = 0;
    }

    function calc_use_last() {
        c_itarget.value = l_total.innerText ? l_total.innerText : 0;
        calc_update_target();
    }

    function calc_add_button(option) {
        let done = false;
        let btn = document.createElement("button");
        btn.className = option.text.toLowerCase().includes('hit') ? "btn btn-outline-info" : "btn btn-outline-primary";
        btn.innerText = option.text;
        btn.id = '_button' + option.text;
        btn.addEventListener("click", () => { calc_add_last(option.text, option.value) });

        c_btn_action.querySelectorAll("div").forEach(element => {
            if (element.querySelectorAll("button").length != 4) {
                element.appendChild(btn);
                done = true;
            }
        });

        if (!done) {
            let div = document.createElement("div");
            div.className = "btn-group btn-matrix";
            div.appendChild(btn);
            c_btn_action.appendChild(div);
        }
    }

    function calc_update_button(old_name, new_name) {
        const button = document.getElementById('_button' + old_name);
        if (button) {
            button.innerText = new_name;
            button.className = new_name.toLowerCase().includes('hit') ? "btn btn-outline-info" : "btn btn-outline-primary";
            button.id = '_button' + new_name;
        }
        calc_clear_last();
    }

    function calc_delete_button(name) {
        const button = document.getElementById('_button' + name);
        if (button) {
            const parent = button.parentElement;
            parent.removeChild(button);
            if (parent.childNodes.length === 0) {
                c_btn_action.removeChild(parent);
            }
        }
        calc_clear_last();
    }

    function actions_disable() {
        if (a_actions.selectedIndex < 0) {
            a_selected.innerHTML = 'None';
            a_iname.value = '';
            a_ivalue.value = '';
            a_iname.classList.remove('is-invalid');
            a_ivalue.classList.remove('is-invalid');
            a_iname.setAttribute('disabled', '');
            a_ivalue.setAttribute('disabled', '');
            a_btn_del.setAttribute('disabled', '');
        }
        return a_actions.selectedIndex;
    }

    function actions_enable() {
        if (a_actions.selectedIndex >= 0) {
            a_iname.classList.remove('is-invalid');
            a_ivalue.classList.remove('is-invalid');
            a_iname.removeAttribute('disabled');
            a_ivalue.removeAttribute('disabled');
            a_btn_del.removeAttribute('disabled');
        }
        return a_actions.selectedIndex;
    }

    function actions_current() {
        return a_actions[a_actions.selectedIndex];
    }

    function actions_add_default_action(name, value) {
        let newAction = new Option(name, value);
        a_actions.add(newAction, undefined);
        calc_add_button(newAction);
    }

    function actions_update_action_name() {
        if (actions_disable() < 0) {
            return;
        }

        const name = a_iname.value.trim();
        const current = actions_current();
        if ((name === "") || (Array.from(a_actions).filter(option => option != current && option.text.toLowerCase() === name.toLowerCase()).length != 0)) {
            a_iname.classList.add('is-invalid');
        } else {
            a_iname.classList.remove('is-invalid');
            const value = name;
            const current = actions_current();

            calc_update_button(current.text, value);
            a_selected.innerHTML = value;
            current.text = value;
        }
    }

    function actions_update_action_value() {
        if (actions_disable() < 0) {
            return;
        }
        const num = parseInt(a_ivalue.value, 10);
        if (!isNaN(num)) {
            a_ivalue.classList.remove('is-invalid');
            actions_current().value = num;
        } else {
            a_ivalue.classList.add('is-invalid');
        }
    }

    function calc_update_target() {
        target_value = parseInt(c_itarget.value, 10);
        target_value = target_value > 0 ? target_value : 0;
        if (target_value > 0) {
            c_itarget.classList.remove('is-invalid');
        } else {
            c_itarget.classList.add('is-invalid');
        }
    }

    function actions_on_select_change() {
        if (actions_enable() < 0) {
            return;
        }
        const option = actions_current();
        a_selected.innerHTML = option.text;
        a_iname.value = option.text;
        a_ivalue.value = option.value;
    }

    function actions_delete() {
        let sel = a_actions.selectedIndex;
        if (actions_disable() < 0) {
            return;
        }
        const current = actions_current();
        calc_delete_button(current.text);
        current.remove();
        a_actions.selectedIndex = Math.max(sel - 1, 0);
        if (actions_disable() < 0) {
            return;
        }
        actions_on_select_change();
    }

    function actions_new() {
        actions_add_default_action("Action " + a_actions.length, 0);
        a_actions.selectedIndex = a_actions.length - 1;
        actions_on_select_change();
    }

    function get_actions() {
        let actions = {};
        a_actions.querySelectorAll("option").forEach(option => {
            actions[option.text] = option.value;
        });
        return actions;
    }

    function get_name() {
        return c_iname.value ? c_iname.value : c_iname.getAttribute('placeholder');
    }

    function get_target() {
        return target_value;
    }

    function get_last() {
        let last = []
        c_ul_last.querySelectorAll("li").forEach(li => {
            last.push(li.innerText);
        });
        return last;
    }

    function calculate() {
        const actions = get_actions();
        let name = get_name();
        const target = get_target();
        const last = get_last();

        const [result, finalLast] = postprocess(actions, target, last);
        const finalItems = result.map(([k, v]) => `${k} x${v}`);
        finalItems.push(...finalLast.map(v => `${v} x1`));

        name = `${name} @ ${target}`;
        result_string = `${name} | ${finalItems.join(", ")}`;

        r_select.setAttribute('size', Math.max(result.length + finalLast.length + 1, 2));
        r_group.setAttribute('label', name);
        r_group.innerHTML = '';
        finalItems.map(v => {
            r_group.appendChild(new Option(v, ''), undefined);
        });

        console.log(result_string);
    }

    // https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
    function fallbackCopyTextToClipboard(text) {
        let textArea = document.createElement("textarea");
        textArea.value = text;

        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            let successful = document.execCommand('copy');
            let msg = successful ? 'successful' : 'unsuccessful';
            console.log('Fallback: Copying text command was ' + msg);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }

        document.body.removeChild(textArea);
    }

    function copy_to_clipboard(text) {
        if (!navigator?.clipboard) {
            fallbackCopyTextToClipboard(text);
            return;
        }
        navigator.clipboard.writeText(text).then(function () {
            console.log('Async: Copying to clipboard was successful!');
        }, function (err) {
            console.error('Async: Could not copy text: ', err);
        });
    }

    function set_btn_clipboard(state) {
        if (!state) {
            r_clipboard_tt.hide();
        }
        r_clipboard.title = state ? 'Copied!' : 'Copy to Clipboard';
        r_clipboard_tt.setContent({ '.tooltip-inner': r_clipboard.title });
    }

    a_actions.addEventListener("change", actions_on_select_change);
    a_iname.addEventListener("input", actions_update_action_name);
    a_ivalue.addEventListener("input", actions_update_action_value);
    a_btn_del.addEventListener("click", actions_delete);
    document.getElementById("actions_btn_new").addEventListener("click", actions_new);
    document.getElementById("generic_hit").addEventListener("click", () => { calc_add_last("Hit", 0) });
    c_btn_clr.addEventListener("click", calc_clear_last);
    l_btn_use.addEventListener("click", calc_use_last);
    c_itarget.addEventListener("input", calc_update_target);
    document.getElementById("btn_calculate").addEventListener("click", calculate);
    r_clipboard.addEventListener("click", () => { if (result_string) { copy_to_clipboard(result_string); set_btn_clipboard(true); } });
    r_clipboard.addEventListener("pointerleave", () => { set_btn_clipboard(false); });

    Object.entries(DEFAULT_ACTIONS).forEach(([k, v]) => {
        actions_add_default_action(k, v);
    });

    calc_update_target();
    actions_disable();
}

var parser = require('./parser.js');
var {fieldIdToType} = require('./data.js');


function clearObj(obj) {
    for (let member in Object.keys(obj)) delete obj[member];
}

var readlineSync = require('readline-sync');
var fs = require('fs');
var text = fs.readFileSync("/Users/piotrdabkowski/PycharmProjects/pydiep/dumps/v2/sandbox.log").toString();

clearObj(fieldIdToType)

function printInteresting(res) {
    if (res.kind !== 0) return;
    let any = false;
    for (let upcreate of res.upcreates) {
        for (let key of Object.keys(upcreate)) {
            if (key.endsWith("$")) {
                console.log(res.update_id, upcreate);
                any = true;
                break;
            }
        }

    }
    if (any) {
        console.log('---------')

    }
}

function printEntityUpdate(id, res, not_len) {
    if (res.kind !== 0) return;
    for (let upcreate of res.upcreates) {
        if (upcreate.entityId === id && Object.keys(upcreate).length !== not_len) {
            console.log(res.update_id, upcreate);
        }
    }
}

function updateTanks(res, tanks) {
    if (res.kind !== 0) return;
    for (let upcreate of res.upcreates) {
        if (upcreate.updateKind === "CREATE") {
            if (upcreate.entityType !== "TANK") {
                continue;
            }
            tanks[upcreate.entityId] = upcreate;
        } else if (upcreate.updateKind === "UPDATE") {
            if (tanks.hasOwnProperty(upcreate.entityId)) {
                Object.assign(tanks[upcreate.entityId], upcreate);
            }
        }
    }
    for (let del of res.deletes) {
        delete tanks[del];
    }
}


function multiInterpret(p) {
    let interpretations = ['i8', 'i32', 'vi', 'vu', 'float'];
    let at = p.at;
    let result = {};
    for (interpretation of interpretations) {
        try {
            result[interpretation] = p[interpretation]()
        } catch (e) {
            result[interpretation] = "CRASH"
        }
        p.at = at;
    }
    result['eid'] = p.curEntityId;
    return result;
}

function getPossibleInterpretations(res) {
    let inter = ["vi"]
    let floatOK = false;
    for (let r of res) {
        if (Math.abs(r["float"]) > 1) {
            floatOK = true
        }
        if (Math.abs(r["float"]) > 1000000) {
            floatOK = false
            break
        }
    }
    if (floatOK) {
        inter.push("float")
    }
    inter.push("i32")
    return inter
}

function checkInterpretationOk(cnt, props) {
    if (cnt["crash"] > 0) {
        return false
    }
    for (let prop of Object.keys(props)) {
        if (prop >= 128) {
            return false
        }
    }
    return true
}



function printDebugInfo(cnt, props, ignore = {}) {
    console.log(Object.keys(props).length);
    let max_prop = getHardestProp(props, ignore)
    let dbg = ""
    for (let pr of Object.keys(props)) {
        dbg += `${pr} -> ${props[pr].length}` + "\n";
    }
    console.log(props[max_prop])
    console.log(max_prop);
    console.log(dbg)
    console.log(cnt)
}


function runParseEval() {
    let props = {};
    let cnt = {ok: 0, fail: 0, no: 0, crash: 0};
    i = 0;
    var tanks = {};
    for (let line of text.split('\n')) {
        if (i++ >= 10000) {
            break
        }
        let p = new parser.Parser(parser.byteStringToBuffer(line));
        try {
            var res = p.parseInbound();
            updateTanks(res, tanks);
            // console.log(tanks);
            if (res.kind !== -1) {
                //printEntityUpdate('1#15', res);
                //printEntityUpdate('1#14', res);

                //printEntityUpdate('1#0', res);
                //readlineSync.question('k');
                cnt.ok++;
            } else {
                cnt.no++;
            }
        } catch (e) {
            if (e.payload === 'tolerate') {
                cnt.no++;
                continue;
            }
            if (!e.payload) {
                cnt.crash += 1;
                console.log("Crashed...")
                continue;
            }
            cnt.fail++;

            if (props.hasOwnProperty(e.payload)) {
                props[e.payload].push(multiInterpret(p));
            } else {
                props[e.payload] = [multiInterpret(p)]
            }
            // let fol = p.getByteString(p.at, p.buffer.length)
            // console.log(fol);
            // let ans = readlineSync.question('chuj');
            // if (ans === 'q') {
            //     break;
            // }
        }
    }
    console.log("Done eval!")
    return {cnt, props}
}


function getHardestProp(props, ignore = {}) {
    let max_prop = 0
    let max_len = 0
    for (let pr of Object.keys(props)) {
        let len = props[pr].length
        if (len > max_len && !ignore.hasOwnProperty(pr)) {
            max_len = len;
            max_prop = pr
        }
    }
    return max_prop
}



// --------------
const ignoreProps = {48:1, compressed:1};

while (1) {
    let {cnt, props} = runParseEval()
    console.log("Status: ", cnt)
    let prop = getHardestProp(props, ignoreProps)
    let guesses = getPossibleInterpretations(props[prop]);
    console.log(`Solving field ${prop} with ${props[prop].length} failures, possible interpretations: ${guesses.join(", ")}`)
    if (props[prop].length < 5) {
        console.log("Not enough stats to solve.")
        break
    }
    for (let guess of guesses) {
        fieldIdToType[prop] = guess
        let {cnt, props} = runParseEval()
        console.log(cnt)
        if (checkInterpretationOk(cnt, props)) {
            console.log(guess, "works fine.")
            break;
        } else {
            console.log(guess, "does not fit...")
            delete fieldIdToType[prop]
        }
    }
    if (!fieldIdToType[prop]) {
        console.log("Could not solve: ", prop)
        break
    }
}
console.log(fieldIdToType)
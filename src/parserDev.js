var parser = require('./parser.js');

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
    let at  = p.at;
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



var readlineSync = require('readline-sync');
var fs = require('fs');
var text = fs.readFileSync("/Users/piotrdabkowski/PycharmProjects/ava/toy/pydiep/hard.log").toString();


let props = {};
let cnt = {ok: 0, fail: 0, no: 0, crash: 0};
i = 0;
var tanks = {};
for (let line of text.split('\n')) {
    if (i++ >= 10000) {break}
    let p = new parser.Parser(parser.byteStringToBuffer(line));
    try {
        var res = p.parseInbound();
        updateTanks(res, tanks);
        console.log(tanks);
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
            console.log(e)
            continue;
        }
        cnt.fail++;

        if (props.hasOwnProperty(e.payload)) {
            props[e.payload].push(multiInterpret(p));
        } else {
            props[e.payload] = [ multiInterpret(p)]
        }
        // let fol = p.getByteString(p.at, p.buffer.length)
        // console.log(fol);
        // let ans = readlineSync.question('chuj');
        // if (ans === 'q') {
        //     break;
        // }
    }
}
// props[53] = 0
// props[55] = 0
console.log(props);
console.log(Object.keys(props).length);
for (let pr of Object.keys(props)) {
    console.log(`${pr} -> ${props[pr].length}`)
}
console.log(cnt);
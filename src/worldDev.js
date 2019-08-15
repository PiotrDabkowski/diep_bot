var world = require("./world.js");
var parser = require("./parser.js");
var data = require("./data.js");


var readlineSync = require('readline-sync');
var fs = require('fs');
var text = fs.readFileSync("/Users/piotrdabkowski/PycharmProjects/ava/toy/pydiep/hard.log").toString();

var w = new world.World();
var stamp = 0;
for (let line of text.split('\n')) {
    let p = new parser.Parser(parser.byteStringToBuffer(line));
    try {
        var packet = p.parseInbound();
    } catch (e) {
        continue;
    }
    w.eatUpdate(packet);
    if (stamp !== w.stamp) {
        let unkc = 0;
        let knoc = 0;
        for (let key of Object.keys(w.entities)) {
            let ent = w.entities[key];
            if (ent.entityType === data.entityTypes.UNKNOWN) {
                unkc++;
            } else {
                knoc++;
            }
            if (ent.hasOwnProperty('x') !== ent.hasOwnProperty('y')) {
                //console.log(ent)
            }
        }
        console.log(JSON.stringify(w.entities));
        // console.log(w.entities['498#14427']);
        console.log();
        stamp = w.stamp;
    }
}

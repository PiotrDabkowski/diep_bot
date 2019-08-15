const updateKinds = {
    CREATE: 1,
    UPDATE: 2,
}

const inPacketKinds = {
    // Inbound.
    UPDATE: 0,
    UPDATE_COMPRESSED: 2,
    IGNORE: -1,
}

const outPacketKinds = {
    INIT: 0,
    INPUT: 1,
    SPAWN: 2,
    UPDATE_STAT: 3,
    UPDATE_TANK: 4,
    HEARTBEAT: 5,
    UNKNOWN: 6,
    EXT_FOUND: 7,
    CLEAR_DEATH: 8,
    TAKE_TANK: 9,
}


const entityTypes = {
    UNKNOWN: "UNKNOWN",
    TANK: "TANK",
    BULLET: "BULLET",
    SHAPE: "SHAPE",
    BOT: "BOT",
    OWN_TANK: "OWN_TANK",
    LEADER_TANK: "LEADER_TANK",
}


// TODO: auto type detection based on the packet dump. This should make the parser much more resistant to updates.
const fieldIdToType = {
    1: "vi",
    2: "vi",
    3: "vi",

    23: "float",
    66: "float",

    18: "float",
    44: "float",
    64: "float",  // confident, bullet x/y?
    65: "float",  // confident, bullet x/y?
    29: "float",  // confident, counter for ffa, on THIS player

    19: "vu", // some weird byte fields
    57: "vu", // some weird byte fields

    20: "float",  // mostly confident, player exp
    35: "float",  // mostly confident, max life

    37: "float",  // time alive of other player?
    28: "float",  // time alive of THIS player?

    //10: 'i8',  // something about this player, not sure what...

    // These params are related to the leveling up process of THIS tank.
    25: "vi", // int goes up by 1 to 33. mass, field of view?
    26: "float", // ???
    27: "float", // ???
    31: "float", // goes down from low value of ~2 to ~1, speed?
    38: 'vi', // level most likely
    39: 'float', // this player exp
    59: 'float', // goes up, mass? field of view? idk

    // ??? wtf, rare and not sure what
    63: 'vu',
    67: 'vu',
    // Unsolved: 8, 10, 14, 41, 53
    53: 'vu',

    //  14: 'i8'
    //  15: "vu",
    //  42: "vu",
    // // 41: "vu",

    // 55: '',
    // // // ????
    // // 37: "float",              
    // //
    // // 65: "float",
    // //
    // // //19: "i8",
    // // 8: "vu",
    // // 63: "vi",
    // // 29: "i32",
    // 19: 'vu',  // ?? important but unknown vu or i32? some large shitty number
    // 57: 'vu',     // triggered by 19
    // 28: "float",
    // 65: "float",
    // 20: "float",  // confident
    // 35: "float",  // confident
    //53: "vu",   // flag-like, similar to 55 but relates to other agents/objects?
    // 55: "i32", // flag-like, related to agent ITSELF, 10 is also kind of similar
}

// This map serves just for the packet interpretation, not parsing.
const fieldNameToId = {
    // Object Properties
    objPosX: 3,
    objPosY: 1,
    objAngle: 2,
    // // Agent Properties
    agentPosX: 66,
    agentPosY: 23,
    agentPosX2: 18,
    agentPosY2: 44,

    fade: 64, //
    opacity: 65, // for example for stalker, shape death etc...

    counter: 29, //  Not in sandbox, present on the 1#0 agent.

    weirdBytes1: 19, // Not sure what they signify, likely they refer to the agent upgrades?
    weirdBytes2: 29,

    expPointsOthert: 20, // current exp of (another) player ?
    maxHealth: 35,
    health: 37,  // (1#15)
    timeAliveThis: 28,

    tankMass: 25,  // not sure here
    // unk1: 26,
    // unk2: 27,
    tankSpeed: 31,
    tankLevel: 38,
    expPointsThis: 39,


    // 54 (1#14) and 15 (1#0) are tank upgrades possibly also 9 (1#14). 41 is a death (1#14)
}

var fieldIdToName = {}
for (let k of Object.keys(fieldNameToId)) {
    fieldIdToName[fieldNameToId[k]] = k
}


const keyInput = {
    LEFT_MOUSE: 1,
    UP: 2,
    LEFT: 4,
    DOWN: 8,
    RIGHT: 16,
    GOD_MODE: 32,
    SUICIDE: 64,
    RIGHT_MOUSE: 128,
    INSTANT_UPGRADE: 256,
    USE_GAMEPAD: 512,
    SWITCH_CLASS: 1024,
    TRUE_CONST: 2048,
}

const directionKeys = {
    UP: keyInput.UP,
    RIGHT_UP: keyInput.RIGHT | keyInput.UP,
    RIGHT: keyInput.RIGHT,
    RIGHT_DOWN: keyInput.RIGHT | keyInput.DOWN,
    DOWN: keyInput.DOWN,
    LEFT_DOWN: keyInput.LEFT | keyInput.DOWN,
    LEFT: keyInput.LEFT,
    LEFT_UP: keyInput.LEFT | keyInput.UP,
}

const directionAccelerations = {
    UP: {x: 0, y: -1},
    RIGHT_UP: {x: 0.707, y: -0.707},
    RIGHT: {x: 1, y: 0},
    RIGHT_DOWN: {x: 0.707, y: 0.707},
    DOWN: {x: 0, y: 1},
    LEFT_DOWN: {x: -0.707, y: 0.707},
    LEFT: {x: -1, y: 0},
    LEFT_UP: {x: -0.707, y: -0.707}
}


const Table = class {
    constructor(table = [], processBy = 0) {
        let processor = processBy === 'function' ? processBy : i => i ^ processBy
        this.table = table
        this.length = table.length

        this.lookup = {}
        this.reverse = {}
        for (let i = 0; i < table.length; i++) {
            this.lookup[processor(i)] = table[i]
            this.reverse[table[i]] = processor(i)
        }
    }

    get(id) {
        return this.lookup[id]
    }

    find(name) {
        if (!this.reverse.hasOwnProperty(name)) {
            throw name
        }
        return this.reverse[name]
    }
}

const statTable = new Table([
    8, // Movement speed
    7,
    6,
    5,
    4,
    3,
    2,
    1, // Health Regen
], 0)


// Useless...
const tankTable = new Table([
    'Tank',
    'Twin',
    'Triplet',
    'Triple Shot',
    'Quad Tank',
    'Octo Tank',
    'Sniper',
    'Machine Gun',
    'Flank Guard',
    'Tri-Angle',
    'Destroyer',
    'Overseer',
    'Overlord',
    'Twin-Flank',
    'Penta Shot',
    'Assassin',
    'Arena Closer',
    'Necromancer',
    'Triple Twin',
    'Hunter',
    'Gunner',
    'Stalker',
    'Ranger',
    'Booster',
    'Fighter',
    'Hybrid',
    'Manager',
    'Mothership',
    'Predator',
    'Sprayer',
    '',
    'Trapper',
    'Gunner Trapper',
    'Overtrapper',
    'Mega Trapper',
    'Tri-Trapper',
    'Smasher',
    '', // Mega Smasher?
    'Landmine',
    'Auto Gunner',
    'Auto 5',
    'Auto 3',
    'Spread Shot',
    'Streamliner',
    'Auto Trapper',
    'Dominator', // Destroyer
    'Dominator', // Gunner
    'Dominator', // Trapper
    'Battleship',
    'Annihilator',
    'Auto Smasher',
    'Spike',
    'Factory',
    '', // Ball, Mounted Turret?
    'Skimmer',
    'Rocketeer',
], 0)


module.exports = {
    updateKinds: updateKinds,
    inPacketKinds: inPacketKinds,
    entityTypes: entityTypes,
    fieldIdToType: fieldIdToType,
    fieldIdToName: fieldIdToName,
    tankTable: tankTable,
    statTable: statTable,
    outPacketKinds: outPacketKinds,
    keyInput: keyInput,
    directionAccelerations: directionAccelerations,
    directionKeys: directionKeys,
}
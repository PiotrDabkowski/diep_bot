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
    MASTER_TANK: "MASTER_TANK",
}


var fieldIdToType = { '1': 'vi',
  '2': 'vi',
  '3': 'vi',
  '5': 'float',
  '8': 'vi',
  '13': 'vi',
  '17': 'vi',
  '18': 'float',
  '19': 'vi',
  '22': 'float',
  '23': 'float',
  '25': 'float',
  '26': 'float',
  '30': 'float',
  '31': 'float',
  '37': 'vi',
  '45': 'float',
  '49': 'float',
  '55': 'float',
}
// From sandbox.
Object.assign(fieldIdToType, { '1': 'vi',
  '2': 'vi',
  '3': 'vi',
  '5': 'float',
  '8': 'vi',
  '13': 'vi',
  '17': 'vi',
  '19': 'vi',
  '21': 'float',
  '22': 'float',
  '23': 'float',
  '24': 'i32',
  '25': 'float',
  '26': 'float',
  '30': 'float',
  '31': 'float',
  '37': 'vi',
  '45': 'float',
  '49': 'float',
  '50': 'float',
  '53': 'vi',
  '55': 'float',
  '58': 'vi',
  '59': 'vi',
  '68': 'float' }
)


// Just these fields are needed...
var fieldNameToId = {
    // agentPosX2: 26,
    // agentPosY2: 30,
    objPosX: 1,
    objPosY: 2,
    objAngle: 3
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
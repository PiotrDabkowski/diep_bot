var data = require("./data.js");


let convo = new ArrayBuffer(4);
let u8 = new Uint8Array(convo);
let i32 = new Uint32Array(convo);
let float = new Float32Array(convo);

let endianSwap = val =>
    ((val & 0xff) << 24)
    | ((val & 0xff00) << 8)
    | ((val >> 8) & 0xff00)
    | ((val >> 24) & 0xff);

const Encoder = class {
    constructor() {
        this.length = 0
        this.buffer = new Uint8Array(4096)
    }

    i8(num) {
        this.buffer[this.length] = num
        this.length += 1
        return this
    }

    i32(num) {
        i32[0] = num
        this.buffer.set(u8, this.length)
        this.length += 4
        return this
    }

    float(num) {
        float[0] = num
        this.buffer.set(u8, this.length)
        this.length += 4
        return this
    }

    vu(num) {
        do {
            let part = num
            num >>>= 7
            if (num) part |= 0x80
            this.buffer[this.length++] = part
        } while (num)
        return this
    }

    vi(num) {
        let sign = (num & 0x80000000) >>> 31
        if (sign) num = ~num
        let part = (num << 1) | sign
        this.vu(part)
        return this
    }

    vf(num) {
        float[0] = num
        this.vi(endianSwap(i32[0]))
        return this
    }

    string(str) {
        if (str) {
            let bytes = new Uint8Array(Buffer.from(str))
            this.buffer.set(bytes, this.length)
            this.length += bytes.length
        }
        this.buffer[this.length++] = 0
        return this
    }

    out() {
        return this.buffer.buffer.slice(0, this.length)
    }

    dump() {
        return Array.from(this.buffer.subarray(0, this.length)).map(r => r.toString(16).padStart(2, 0)).join(' ')
    }


    encodeOutbound(packet) {
        switch (packet.kind) {
            case data.outPacketKinds.INIT:
                return this.encodeInit(packet)
            case data.outPacketKinds.INPUT:
                return this.encodeInput(packet)
            case data.outPacketKinds.SPAWN:
                return this.encodeSpawn(packet)
            case data.outPacketKinds.UPDATE_STAT:
                return this.encodeUpdateStat(packet)
            case data.outPacketKinds.UPDATE_TANK:
                return this.encodeUpdateTank(packet)
            case data.outPacketKinds.EXT_FOUND:
                // Hah, we do not want to inform anybody that we are cheating
                return false
            default:
                // passthrough
                if (packet.data) {
                    return packet.data
                } else {
                    return this.vu(packet.kind).out()
                }
        }
    }

    encodeInput(packet) {
        return this.vu(packet.kind).vu(packet.key).vf(packet.x).vf(packet.y).out()
    }

    encodeInit(packet) {
        return this.vu(packet.kind).string(packet.build).string(packet.unk1).string(packet.partyId).string(packet.unk2).out()
    }

    encodeSpawn(packet) {
        return this.vu(packet.kind).string(packet.name).out()
    }
    encodeUpdateStat(packet) {
        return this.vu(packet.kind).vu(packet.statId).vu(packet.upto).out()
    }

    encodeUpdateTank(packet) {
        return this.vu(packet.kind).vu(packet.tankId).out()
    }

}



module.exports = {Encoder: Encoder};


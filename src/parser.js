var data = require("./data.js")

let convo = new ArrayBuffer(4)
let u8 = new Uint8Array(convo)
let i32 = new Uint32Array(convo)
let float = new Float32Array(convo)

const Parser = class {
    constructor(content) {
        this.at = 0
        this.buffer = new Uint8Array(content)
        this.curEntityId = ''
    }

    i8() {
        let res = this.buffer[this.at++]
        this.assertNotOOB()
        return res

    }

    endianSwap(val) {
        return ((val & 0xff) << 24)
            | ((val & 0xff00) << 8)
            | ((val >> 8) & 0xff00)
            | ((val >> 24) & 0xff)
    }


    i32() {
        u8.set(this.buffer.subarray(this.at, this.at += 4))
        this.assertNotOOB()
        return i32[0]
    }

    float() {
        u8.set(this.buffer.subarray(this.at, this.at += 4))
        this.assertNotOOB()
        return float[0]
    }

    vleft() {
        this.at--
        let i = 1
        while (this.buffer[this.at - 1] & 0x80 && i < 4) {
            this.at--
            i++
        }
    }

    vu() {
        let out = 0
        let at = 0
        while (this.buffer[this.at] & 0x80) {
            out |= (this.buffer[this.at++] & 0x7f) << at
            at += 7
        }
        out |= this.buffer[this.at++] << at
        this.assertNotOOB()
        return out
    }

    vi() {
        let out = this.vu()
        let sign = out & 1
        out >>= 1
        if (sign) out = ~out
        this.assertNotOOB()
        return out
    }

    vf() {
        i32[0] = this.endianSwap(this.vi())
        this.assertNotOOB()
        return float[0]
    }

    string() {
        let res = ""
        while (this.buffer[this.at]) {
            res += String.fromCharCode(this.buffer[this.at])
            this.at++
        }
        this.at++
        this.assertNotOOB()
        return res
    }

    getByteString(start, end) {
        let bytes = ""
        while (start < end && start < this.buffer.length) {
            let num = this.buffer[start]
            bytes += (num < 16 ? '0' : '') + num.toString(16) + " "
            start++
        }
        return bytes
    }

    isEOF() {
        return this.at === this.buffer.length
    }

    raiseUnexpected(msg, payload) {
        // The error could be the result of the parsing error at the earlier position.
        let info = `Error at pos ${this.at}: ${msg}`
        if (payload !== 'tolerate') {
            console.log(info)
        }
        let err = new Error(info)
        err.payload = payload
        throw err
    }

    assertEOF() {
        if (!this.isEOF()) {
            this.raiseUnexpected("Expected end of packet.")
        }
    }

    assertNotOOB() {
        if (this.at > this.buffer.length) {
            this.raiseUnexpected("Unexpected end of packet.")
        }
    }

    assertNoIntersectingKeys(obja, objb) {
        return
        for (let key of Object.keys(obja)) {
            if (objb.hasOwnProperty(key)) {
                this.raiseUnexpected(`Duplicate field ${key} (${obja[key]} vs ${objb[key]})`)
            }
        }
    }


    // Format

    parseOutbound() {
        let packet_kind_id = this.i8()
        switch (packet_kind_id) {
            case data.outPacketKinds.INIT:
                return this.parseInit()
            case data.outPacketKinds.INPUT:
                return this.parseInput()
            case data.outPacketKinds.SPAWN:
                return this.parseSpawn()
            case data.outPacketKinds.UPDATE_STAT:
                return this.parseUpdateStat()
            case data.outPacketKinds.UPDATE_TANK:
                return this.parseUpdateTank()
            default:
                return {
                    kind: packet_kind_id,
                    data: this.buffer,
                }

        }
    }

    parseInput() {
        let res = {
            kind: data.outPacketKinds.INPUT,
            key: this.vu(),
            x: this.vf(),
            y: this.vf(),
        }
        if (!this.isEOF()) {
            console.log("Unexpected end of output 'input' packet.")
        }
        this.assertEOF()
        return res
    }

    parseInit() {
        if (this.isEOF()) {
            return {kind: data.outPacketKinds.INIT}
        }
        let res = {
            kind: data.outPacketKinds.INIT,
            build: this.string(),
            unk1: this.string(),
            partyId: this.string(),
            unk2: this.string(),
        }
        this.assertEOF()
        return res
    }

    parseSpawn() {
        let res = {
            kind: data.outPacketKinds.SPAWN,
            name: this.string(),
        }
        this.assertEOF()
        return res
    }

    parseUpdateStat() {
        let res = {
            kind: data.outPacketKinds.UPDATE_STAT,
            statId: this.vu(),
            upto: this.vu(),
        }
        this.assertEOF()
        return res
    }

    parseUpdateTank() {
        let res = {
            kind: data.outPacketKinds.UPDATE_TANK,
            tankId: this.vu(),
        }
        this.assertEOF()
        return res
    }


    parseInbound() {
        let packet_kind_id = this.i8()
        if (packet_kind_id === data.inPacketKinds.UPDATE) {
            if (this.buffer.length < 2) {
                return this.ignorePacket("?")
            } else {
                return this.updatePacket()
            }
        } else if (packet_kind_id === data.inPacketKinds.UPDATE_COMPRESSED) {
            return this.updateCompressedPacket()
        } else {
            return this.ignorePacket(packet_kind_id)
        }
    }

    updatePacket() {
        let updateId = this.vu()
        let result = {
            kind: data.inPacketKinds.UPDATE,
            updateId: updateId,
            deletes: this.multiEntityDeletes(),
            upcreates: this.multiEntityUpcreates(),
        }
        this.assertEOF()
        return result
    }

    updateCompressedPacket() {
        this.raiseUnexpected("UPDATE_COMPRESSED not supported", "compressed")
    }

    ignorePacket(ignore_reason) {
        return {
            kind: data.inPacketKinds.IGNORE,
            ignore_reason: ignore_reason,
        }
    }

    entityId() {
        let eid = this.vu() + '#' + this.vu()
        this.curEntityId = eid
        return eid
    }

    isMatch(arr) {
        if (this.at + arr.length > this.buffer.length) {
            return false
        }
        for (let i = 0; i < arr.length; i++) {
            if (this.buffer[i + this.at] !== arr[i]) {
                return false
            }
        }
        return true
    }


    moveToNextCreate() {
        while (++this.at < this.buffer.length) {
            if (this.entityCreateTypeId() !== data.entityTypes.UNKNOWN && this.buffer[this.at - 1] === 0 && this.buffer[this.at - 2] === 1) {
                this.vleft()
                this.vleft()
                this.vleft()
                this.vleft()
                return
            }
        }
        this.assertEOF()
    }

    entityCreateTypeId() {
        if (this.isMatch([2, 0, 5, 3, 0, 3])) {
            return data.entityTypes.TANK
        } else if (this.isMatch([2, 0, 7, 0, 1])) {
            return data.entityTypes.BULLET
        } else if (this.isMatch([2, 0, 5, 3, 0, 1])) {
            return data.entityTypes.SHAPE
        } else {
            //         let fol = this.getByteString(this.at, this.buffer.length)
            //
            // console.log("UNKNOWN TYPE: ", fol)
            return data.entityTypes.UNKNOWN
        }
    }

    fieldIdSpec() {
        return this.vu() ^ 1
    }

    updateKind() {
        let create = this.vu()
        let update = this.vu()
        if (create === 1 && update === 0) {
            return data.updateKinds.CREATE
        } else if (create === 0 && update === 1) {
            return data.updateKinds.UPDATE

        } else {
            console.log()
            this.raiseUnexpected(`Unknown update type: ${create} ${update}`, update === 9 ? 'tolerate' : null)
        }
    }

    multiEntityDeletes() {
        let num_deletes = this.vu()
        var deletes = []
        for (var i = 0; i < num_deletes; i++) {
            deletes.push(this.entityId())
        }
        return deletes
    }

    multiEntityUpcreates() {
        let num_upcreates = this.vu()
        var upcreates = []
        for (var i = 0; i < num_upcreates; i++) {
            if (this.isEOF()) {
                console.log('unexpected eof...')
                break
            }
            upcreates.push(this.entityUpcreate())
        }
        this.assertEOF()
        return upcreates

    }

    entityUpcreate() {
        let entityId = this.entityId()
        let updateKind = this.updateKind()
        let result = {
            entityId: entityId,
            updateKind: updateKind,
        }
        if (updateKind === data.updateKinds.CREATE) {
            Object.assign(result, this.entityCreate())
        } else if (updateKind === data.updateKinds.UPDATE) {
            Object.assign(result, this.entityUpdate())

        } else {
            this.raiseUnexpected("Internal error")
        }
        return result
    }

    parseField(field_id) {
        if (!data.fieldIdToType.hasOwnProperty(field_id)) {
            this.raiseUnexpected(`Unknown property field_id: ${field_id} @ ${this.curEntityId}`, field_id)
        }
        let field_type = data.fieldIdToType[field_id]
        if (!(field_type in this)) {
            this.raiseUnexpected(`Internal error: method to parse field_type ${field_name} not implemented`)
            return {}
        }
        let result = {}
        let fieldName = data.fieldIdToName.hasOwnProperty(field_id) ? data.fieldIdToName[field_id] : `unk_${field_type}_${field_id}`
        result[fieldName] = this[field_type]()
        return result
    }


    entityUpdate() {
        let field_id = this.fieldIdSpec()
        let result = {}
        while (1) {
            let field_result = this.parseField(field_id)
            this.assertNoIntersectingKeys(result, field_result)
            Object.assign(result, field_result)
            let next_field_id_diff = this.fieldIdSpec()
            if (next_field_id_diff === 0) {
                // No more fields ot parse for this entity.
                break
            }
            field_id += next_field_id_diff
        }
        return result

    }

    entityCreate() {
        let entityType = this.entityCreateTypeId()
        if (entityType === data.entityTypes.UNKNOWN) {
            this.raiseUnexpected(`Entity create: ${this.curEntityId}, ${entityType}.`, 'create')
        }
        let res = {entityType: entityType}
        this.moveToNextCreate()
        return res
    }
}


function bytesToBuffer(bytes) {
    let buffer = new ArrayBuffer(bytes.length)
    let buffer_view = new Uint8Array(buffer)
    let i = 0
    for (let byte of bytes) {
        buffer_view[i++] = byte
    }
    return buffer
}

function byteStringToBuffer(byteString) {
    let byte_strs = byteString.split(' ')
    let bytes = []
    for (let byte_str of byte_strs) {
        bytes.push(parseInt(byte_str, 16))
    }
    return bytesToBuffer(bytes)
}

module.exports = {Parser: Parser, byteStringToBuffer: byteStringToBuffer, bytesToBuffer: bytesToBuffer}
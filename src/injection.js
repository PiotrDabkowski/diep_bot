
function inject(handleRecvData, handleSendData) {
    var wsInstances = new Set();
    var proxiedSend = window.WebSocket.prototype.send;

    window.WebSocket.prototype.send = function (data_) {
        // Data is provided as the UInt8 view, any kind of buffer or view can be returned.
        let data = new Uint8Array(data_)
        if (!wsInstances.has(this)) {
            console.log("Hello: New WebSocket is being used.")
            wsInstances.add(this);
            var inst = this;
            var proxiedRecv = inst.onmessage;
            this.onmessage = function (event) {
                if (handleRecvData) {
                    event.data = handleRecvData.call(this, new Uint8Array(event.data));
                }
                if (event.data) {
                    return proxiedRecv.call(this, event);
                }
            };
        }
        try {
            if (handleSendData) {
                data = handleSendData.call(this, data);
            }
        }
        catch (e) {
            console.log(e)
        }
        if (data) {
            return proxiedSend.call(this, data);
        }
    };
    console.log('injection ok')
    return proxiedSend
}

module.exports = { inject }
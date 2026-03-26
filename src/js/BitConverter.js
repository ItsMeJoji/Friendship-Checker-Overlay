class BitConverter {
    static toInt32(bytes, offset = 0) {
        const dataView = new DataView(new Uint8Array(bytes).buffer);
        return dataView.getInt32(offset, true); // true for little-endian
    }

    static toFloat32(bytes, offset = 0) {
        const dataView = new DataView(new Uint8Array(bytes).buffer);
        return dataView.getFloat32(offset, true);
    }

    static toFloat64(bytes, offset = 0) {
        const dataView = new DataView(new Uint8Array(bytes).buffer);
        return dataView.getFloat64(offset, true);
    }

    static toUint16(bytes, offset = 0) {
        const dataView = new DataView(new Uint8Array(bytes).buffer);
        return dataView.getUint16(offset, true);
    }

    static toInt16(bytes, offset = 0) {
        const dataView = new DataView(new Uint8Array(bytes).buffer);
        return dataView.getInt16(offset, true);
    }

    static getBytes(value, type) {
        let buffer;
        if (type === "Int32") {
            buffer = new ArrayBuffer(4);
            new DataView(buffer).setInt32(0, value, true);
        } else if (type === "Float32") {
            buffer = new ArrayBuffer(4);
            new DataView(buffer).setFloat32(0, value, true);
        } else if (type === "Float64") {
            buffer = new ArrayBuffer(8);
            new DataView(buffer).setFloat64(0, value, true);
        } else {
            throw new Error("Unsupported type.");
        }
        return new Uint8Array(buffer);
    }
}
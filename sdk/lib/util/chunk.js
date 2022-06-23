"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function chunk(array, size) {
    if (!array)
        return [];
    const firstChunk = array.slice(0, size); // create the first chunk of the given array
    if (!firstChunk.length) {
        return array; // this is the base case to terminal the recursive
    }
    return [firstChunk].concat(chunk(array.slice(size, array.length), size));
}
exports.default = chunk;
//# sourceMappingURL=chunk.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Oracle = exports.UpOrDown = void 0;
var UpOrDown;
(function (UpOrDown) {
    UpOrDown[UpOrDown["None"] = 0] = "None";
    UpOrDown[UpOrDown["Up"] = 1] = "Up";
    UpOrDown[UpOrDown["Down"] = 2] = "Down";
})(UpOrDown = exports.UpOrDown || (exports.UpOrDown = {}));
var Oracle;
(function (Oracle) {
    Oracle[Oracle["Undefined"] = 0] = "Undefined";
    Oracle[Oracle["Chainlink"] = 1] = "Chainlink";
    Oracle[Oracle["Pyth"] = 2] = "Pyth";
    Oracle[Oracle["Switchboard"] = 3] = "Switchboard";
})(Oracle = exports.Oracle || (exports.Oracle = {}));
//# sourceMappingURL=types.js.map
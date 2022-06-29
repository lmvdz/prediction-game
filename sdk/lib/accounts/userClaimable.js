"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UserClaimable {
    constructor(account) {
        this.account = account;
    }
    async updateData(data) {
        this.account = data;
        return true;
    }
}
exports.default = UserClaimable;
//# sourceMappingURL=userClaimable.js.map
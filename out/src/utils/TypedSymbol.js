"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @final
 */
class TypedSymbol {
    constructor(
        /**
         * The symbols globally unique ID.
         */
        id = (++TypedSymbol.counter).toString(36), name = id) {
        this.id = id;
        this.name = name;
        // Do nothing. The constructor solely exists to prevent this
        // class from being instantiated with `new`.
    }
    /**
     * Creates a new typed symbol.
     */
    static create(name) {
        return new TypedSymbol(name);
    }
    toString() {
        return this.id;
    }
}
TypedSymbol.counter = 0;
exports.default = TypedSymbol;
//# sourceMappingURL=TypedSymbol.js.map
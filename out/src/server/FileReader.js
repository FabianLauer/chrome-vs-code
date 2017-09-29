"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Base class for objects that read static files on the disk.
 */
class FileReader {
    /**
     * Returns the content of the file.
     */
    getContent() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getContentConcrete();
        });
    }
}
exports.default = FileReader;
//# sourceMappingURL=FileReader.js.map
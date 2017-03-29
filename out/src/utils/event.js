"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
class Event {
    constructor() {
        this.suspended = false;
    }
    bind(handler) {
        if (this.handlers) {
            this.handlers.push(handler);
        }
        else {
            this.handlers = [handler];
        }
        return handler;
    }
    once(handler) {
        this.bind((() => {
            this.unbind(handler);
            handler.apply(null, arguments);
        }));
    }
    unbind(handler) {
        if (this.handlers && this.handlers.length > 0) {
            let index = this.handlers.indexOf(handler);
            while (index !== -1) {
                this.handlers.splice(index, 1);
                index = this.handlers.indexOf(handler);
            }
        }
        if (this.handlers.length === 0) {
            this.handlers = undefined;
        }
    }
    trigger(...args) {
        if (this.isSuspended()) {
            return;
        }
        if (this.handlers && this.handlers.length > 0) {
            this.handlers.forEach(handler => handler.apply(null, args));
        }
    }
    isSuspended() {
        return this.suspended;
    }
    suspend() {
        this.suspended = true;
    }
    unsuspend() {
        this.suspended = false;
    }
    getHandlerCount() {
        if (!Array.isArray(this.handlers)) {
            return 0;
        }
        return this.handlers.length;
    }
    getReadonlyHandlerList() {
        if (!Array.isArray(this.handlers)) {
            return [];
        }
        return [].concat(this.handlers);
    }
}
exports.Event = Event;
class AsyncEvent extends Event {
    once(handler) {
        this.bind((() => __awaiter(this, arguments, void 0, function* () {
            this.unbind(handler);
            yield handler.apply(null, arguments);
        })));
    }
    trigger(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            const handlers = this.getReadonlyHandlerList();
            for (const handler of handlers) {
                yield handler.apply(null, args);
            }
        });
    }
}
exports.AsyncEvent = AsyncEvent;
class SmartEvent extends Event {
    constructor() {
        super(...arguments);
        this.onBeforeFirstBind = new Event();
        this.onAfterLastUnbind = new Event();
    }
    bind(handler) {
        if (this.getHandlerCount() < 1) {
            this.onBeforeFirstBind.trigger(this);
        }
        return super.bind(handler);
    }
    unbind(handler) {
        super.unbind(handler);
        if (this.getHandlerCount() < 1) {
            this.onAfterLastUnbind.trigger(this);
        }
    }
}
exports.SmartEvent = SmartEvent;
//# sourceMappingURL=event.js.map
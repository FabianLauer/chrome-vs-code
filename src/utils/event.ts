export class Event<THandler extends Function> {
	public bind(handler: THandler): THandler {
		if (this.handlers) {
			this.handlers.push(handler);
		} else {
			this.handlers = [handler];
		}
		return handler;
	}


	public once(handler: THandler): void {
		this.bind(<any>(() => {
			this.unbind(handler);
			handler.apply(null, arguments);
		}));
	}


	public unbind(handler: THandler): void {
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


	public trigger(...args: any[]): void {
		if (this.handlers && this.handlers.length > 0) {
			this.handlers.forEach(handler => handler.apply(null, args));
		}
	}


	public isSuspended(): boolean {
		return this.suspended;
	}


	public suspend(): void {
		this.suspended = true;
	}


	public unsuspend(): void {
		this.suspended = false;
	}


	protected getHandlerCount(): number {
		if (!Array.isArray(this.handlers)) {
			return 0;
		}
		return this.handlers.length;
	}


	protected getReadonlyHandlerList(): THandler[] {
		if (!Array.isArray(this.handlers)) {
			return [];
		}
		return [].concat(this.handlers);
	}


	private handlers: THandler[];


	private suspended = false;
}



export class AsyncEvent<THandler extends (...args: any[]) => Promise<void>> extends Event<THandler> {
	public once(handler: THandler): void {
		this.bind(<any>(async () => {
			this.unbind(handler);
			await handler.apply(null, arguments);
		}));
	}


	public async trigger(...args: any[]): Promise<void> {
		const handlers = this.getReadonlyHandlerList();
		for (const handler of handlers) {
			await handler.apply(null, args);
		}
	}
}



export class SmartEvent<THandler extends Function> extends Event<THandler> {
	public readonly onBeforeFirstBind = new Event<(event: this) => void>();
	public readonly onAfterLastUnbind = new Event<(event: this) => void>();


	public bind(handler: THandler): THandler {
		if (this.getHandlerCount() < 1) {
			this.onBeforeFirstBind.trigger(this);
		}
		return super.bind(handler);
	}


	public unbind(handler: THandler): void {
		super.unbind(handler);
		if (this.getHandlerCount() < 1) {
			this.onAfterLastUnbind.trigger(this);
		}
	}
}

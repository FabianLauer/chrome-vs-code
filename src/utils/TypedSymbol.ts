/**
 * @final
 */
export default class TypedSymbol<T> {
	/**
	 * Creates a new typed symbol.
	 */
	public static create<T>(name?: string) {
		return new TypedSymbol<T>(name);
	}


	protected constructor(
		/**
		 * The symbols globally unique ID.
		 */
		public readonly id: string = (++TypedSymbol.counter).toString(36),
		public readonly name = id
	) {
		// Do nothing. The constructor solely exists to prevent this
		// class from being instantiated with `new`.
	}


	public toString() {
		return this.id;
	}


	private static counter = 0;
}

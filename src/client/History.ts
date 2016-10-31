import HistoryEntry from './HistoryEntry';

export default class History<TEntry extends HistoryEntry> {
	/**
	 * Returns the current history entry.
	 */
	public getCurrent(): TEntry {
		return this.entries[this.currentIndex];
	}


	/**
	 * Pushes an entry to the history and makes it the current entry.
	 * @param entry The entry to push to the history.
	 */
	public async push(entry: TEntry): Promise<void> {
		if (this.getCurrent() instanceof HistoryEntry && this.getCurrent().uri === entry.uri) {
			this.entries[this.currentIndex] = entry;
		} else {
			this.entries.splice(0, this.currentIndex);
			this.entries.unshift(entry);
			this.currentIndex = 0;
		}
	}


	public canGoForward(): boolean {
		return this.currentIndex !== 0;
	}


	public canGoBackward(): boolean {
		return this.currentIndex < this.entries.length - 1;
	}


	/**
	 * Moves back by a certain number of entries and returns the new current entry.
	 */
	public async goBack(entries = 1): Promise<void> {
		this.currentIndex = Math.min(this.currentIndex + entries, this.entries.length - 1);
	}


	/**
	 * Moves forward by a certain number of entries and returns the new current entry.
	 */
	public async goForward(entries = 1): Promise<void> {
		this.currentIndex = Math.max(this.currentIndex - entries, 0);
	}


	private entries: TEntry[] = [];
	private currentIndex = 0;
}

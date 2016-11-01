import HistoryEntry from './HistoryEntry';

interface IReadonlyHistory<TEntry extends HistoryEntry> {
	/**
	 * Returns the current history entry.
	 */
	getCurrent(): TEntry;
}

export default IReadonlyHistory;

/**
 * Resolves a promise after a given number of milliseconds.
 * @param milliseconds The number of milliseconds to wait before resolving the returned promise.
 */
export default function sleep(milliseconds: number): Promise<void> {
	return new Promise<void>(resolve => {
		setTimeout(resolve, milliseconds);
	});
}

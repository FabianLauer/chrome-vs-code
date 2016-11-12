import * as net from 'net';

/**
 * Finds an unused network interface port.
 * @see https://gist.github.com/mikeal/1840641
 */
export async function findFreePort(): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const port = Math.floor(Math.random() * 10000) + 8000;
		const server = net.createServer();
		server.on('error', async () => resolve(await findFreePort()));
		server.listen(port, () => {
			server.once('close', () => resolve(port));
			server.close();
		});
	});
}

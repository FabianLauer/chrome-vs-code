/**
 * Base class for objects that read static files on the disk.
 */
abstract class FileReader<TOutput> {
	/**
	 * Returns the content of the file.
	 */
	public async getContent(): Promise<TOutput> {
		return this.getContentConcrete();
	}


	protected abstract getContentConcrete(): Promise<TOutput>;
}

export default FileReader;

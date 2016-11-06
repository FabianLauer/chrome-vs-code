import IFrameBindings from './IFrameBindings';
import IBrowserConfiguration from '../server/IBrowserConfiguration';

/**
 * Describes the API exposed by the browser to content frames with an about:// page.
 */
interface IPrivilegedFrameBindings extends IFrameBindings {
	/**
	 * Returns the browser configuration as an object.
	 */
	getConfiguration(): Promise<IBrowserConfiguration>;
}

export default IPrivilegedFrameBindings;

interface IRenderable {
	getDOM(): HTMLElement;
	render(): Promise<void>;
}

export default IRenderable;

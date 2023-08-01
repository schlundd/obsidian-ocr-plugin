import { App, Modal } from "obsidian";

export class ShowTextModal extends Modal {

	message: string
  title: string

	constructor(app: App, title: string, message: string) {
		super(app);
		this.message = message
    this.title = title
	}

	onOpen() {
		this.titleEl.setText(this.title)
		this.contentEl.setText(this.message)
	}

	onClose() {
		this.containerEl.empty()
	}
}
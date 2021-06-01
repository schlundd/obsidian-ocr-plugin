import { App, Modal, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';

interface TaskboneOCRPluginSettings {
	token: string
}

const DEFAULT_SETTINGS: TaskboneOCRPluginSettings = {
	// for testing purposes
	// will be removed
	// token valid until Monday, June 14, 2021 4:36:36 AM
	token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ3d3cudGFza2JvbmUuY29tIiwiYXVkIjoib2NyLnRhc2tib25lLmNvbSIsInN1YiI6InRlc3QiLCJleHAiOjE2MjM2NDUzOTZ9.tOWQkBRhPsfYHCdK5xDTH50YL27zo2BZdJwnk5e0CM4'
}

const BASE_URL = "https://ocr.taskbone.com"

export default class TaskboneOCRPlugin extends Plugin {
	settings: TaskboneOCRPluginSettings;

	async onload() {
		console.log('Taskbone OCR: start loading plugin');

		await this.loadSettings();

		this.addCommand({
			id: 'open-image-select-modal',
			name: 'Create annotation page for image',
			callback: () => {
				const images = this.getNotAnnotatedImagePaths()
				if (images.length > 0) {
					new FileSelectorModal(this.app, this).open();
				} else {
					new ErrorModal(this.app, "All supported image files already have an annotation file.").open();
				}
			}
		});

		this.addSettingTab(new TaskboneOCRSettingTab(this.app, this));
	}

	onunload() {
		console.log('Taskbone OCR: unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async getTextForFile(path: string): Promise<string> {
		const vault = this.app.vault;
		const file = vault.getFiles().filter((file) => {
			return file.path == path
		})[0]
		const fileBuffer = await this.app.vault.readBinary(file);
		const formData = new FormData();
		formData.append('image', new Blob([fileBuffer]))
		const response = await fetch(BASE_URL + '/get-text', {
			headers: {
				'Authorization': 'Bearer ' + this.settings.token
			},
			method: "post",
			body: formData
		});
		if (response.status == 200) {
			const jsonResponse = await response.json();
			const text = jsonResponse?.text
			return text || ''
		} else {
			const errorText = `Could not read Text from ${path}:<br/> Error: ${response.status}`
			new ErrorModal(this.app, errorText).open();
		}
	}

	async createAnnotationFileForFile(path: string): Promise<void> {
		const imageText = await this.getTextForFile(path)
		if (!imageText) return
		if (imageText.length == 0) {
			new ErrorModal(this.app, `No text found in ${path}`).open()
		} else {
			const annotationFileContent = `![[${path}]]\n\n${imageText}`
			const annotationFilePath = path + '.annotations.md'
			this.app.vault.create(annotationFilePath, annotationFileContent)
		}
	}

	getNotAnnotatedImagePaths(): string[] {
		const files = this.app.vault.getFiles()
		const markdownFilePaths = this.app.vault.getMarkdownFiles().map((file) => {
			return file.path
		});
		const images = files.filter((file) => {
			const isImage = ['png', 'jpg', 'jpeg'].includes(file.extension)
			if (!isImage) return false
			const annotationFilePath = file.path + '.annotations.md'
			const annotationFileAlreadyExist = markdownFilePaths.contains(annotationFilePath);
			return !annotationFileAlreadyExist
		})
		const imagePaths = images.map((file) => {
			return file.path
		})
		return imagePaths;
	}

}

class FileSelectorModal extends SuggestModal<string> {
	plugin: TaskboneOCRPlugin

	constructor(app: App, plugin: TaskboneOCRPlugin) {
		super(app);
		this.app = app;
		this.plugin = plugin
	}

	getSuggestions(query: string): string[] {

		const imagePaths = this.plugin.getNotAnnotatedImagePaths()
		if (query.length == 0) {
			return imagePaths
		}
		const filteredImageNames = imagePaths.filter((path, index, paths) => {
			const match = path.contains(query)
			return path.contains(query)
		})
		return filteredImageNames
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.setText(value);
	}

	async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent): Promise<void> {
		this.plugin.createAnnotationFileForFile(item);
	}
}

class ErrorModal extends Modal {

	message: string

	constructor(app: App, message: string) {
		super(app);
		this.message = message
	}

	onOpen() {
		this.titleEl.setText("Taskbone OCR Error")
		this.contentEl.innerHTML = this.message
	}

	onClose() {
		this.containerEl.empty()
	}
}

class TaskboneOCRSettingTab extends PluginSettingTab {
	plugin: TaskboneOCRPlugin;

	constructor(app: App, plugin: TaskboneOCRPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Taskbone OCR Settings' });

		new Setting(containerEl)
			.setName('Authentication Token')
			.setDesc('The token used to authenticate at the online OCR Service')
			.addText(text => text
				.setPlaceholder('Enter your token')
				.setValue(this.plugin.settings.token)
				.onChange(async (value) => {
					this.plugin.settings.token = value;
					await this.plugin.saveSettings();
				}));
	}
}

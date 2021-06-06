import { App, Modal, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';

interface TaskboneOCRPluginSettings {
	standardToken?: string,
	premiumToken?: string,
	termsAccepted: boolean,
	isPremium: boolean
}

const DEFAULT_SETTINGS: TaskboneOCRPluginSettings = {
	termsAccepted: false,
	isPremium: false
}

const BASE_URL = "https://ocr.taskbone.com"
const privacyPolicyURL = "https://www.taskbone.com/legal/privacy"
const contactURL = "http://www.taskbone.com/contact"

export default class TaskboneOCRPlugin extends Plugin {
	settings: TaskboneOCRPluginSettings;

	async onload() {
		console.log('Taskbone OCR: start loading plugin');

		await this.loadSettings();
		this.addSettingTab(new TaskboneOCRSettingTab(this.app, this));

		this.addCommand({
			id: 'open-image-select-modal',
			name: 'Create annotation page for image',
			callback: async () => {
				if(!this.settings.termsAccepted) {
					const errorText = `Please go to the Taskbone OCR plugin settings and accept the privacy policy.`
					return new ErrorModal(this.app, errorText).open()
				}
				if(!this.settings.isPremium) {
					if(!this.settings.standardToken) {
						const tokenResponse = await fetch(BASE_URL + '/get-new-token', {
							method: 'post'
						})
						if (tokenResponse.status == 200) {
							const jsonResponse = await tokenResponse.json();
							this.settings.standardToken = jsonResponse.token
							this.saveSettings()
						} else {
							const errorText = `Taskbone OCR Error: ${tokenResponse.status}<br/>Please try again later.`
							return new ErrorModal(this.app, errorText).open();
						}
					}
				} else {
					if(!this.settings.premiumToken) {
						const errorText = `Your plugin configuration is incomplete. Check the plugin settings and either enter a token or disable the 'I have a personal token' setting.`
						return new ErrorModal(this.app, errorText).open();
					}
				}
				const images = this.getNotAnnotatedImagePaths()
				if (images.length > 0) {
					new FileSelectorModal(this.app, this).open();
				} else {
					new ErrorModal(this.app, "All supported image files already have an annotation file.").open();
				}
			}
		});
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
		const token = this.settings.isPremium?this.settings.premiumToken:this.settings.standardToken
		try {
			const response = await fetch(BASE_URL + '/get-text', {
				headers: {
					'Authorization': 'Bearer ' + token
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
		} catch (error) {
			const errorText = `The OCR service seems unavailable right now. Please try again later.`
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
		containerEl.createEl('p', { text: 'The Taskbone OCR service is provided for free (within reasonable limits).' })

		const div = containerEl.createEl('div');
		const premiumText = document.createElement('p');
		premiumText.innerHTML = `<a href="${contactURL}">Get in touch</a> if you think you are outside of these limits or if you are interested in any of the following features:<ul><li>PDF support</li><li>bigger file size limit</li><li>bulk operations (e.g. process a whole directory with lots of images)</li><li>General image annotations (find relevant tags for images)</li></ul>`
		div.appendChild(premiumText);

		const acceptTermsSetting = new Setting(containerEl)
			.setName('Accept Privacy Policy and Terms and Conditions')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.termsAccepted)
					.onChange((value) => {
						this.plugin.settings.termsAccepted = value;
						this.plugin.saveData(this.plugin.settings);
						this.display();
					})
			);
		acceptTermsSetting.descEl.innerHTML = `I accept the Taskbone <a href="${privacyPolicyURL}">Privacy Policy</a>`

		new Setting(containerEl)
			.setName('I have a personal token')
			.setDesc('Switch on, if you received a custom authentication token')
			.addToggle((toggle) =>
			toggle
				.setValue(this.plugin.settings.isPremium)
				.onChange((value) => {
					this.plugin.settings.isPremium = value;
					this.plugin.saveData(this.plugin.settings);
					this.display();
				}))

		if(this.plugin.settings.isPremium) {
			new Setting(containerEl)
			.setName('Authentication Token')
			.setDesc('Copy and paste the token you received from taskbone')
			.addText(text => text
				.setPlaceholder('Enter your token')
				.setValue(this.plugin.settings.premiumToken)
				.onChange(async (value) => {
					this.plugin.settings.premiumToken = value;
					await this.plugin.saveSettings();
				}));
		}
	}
}

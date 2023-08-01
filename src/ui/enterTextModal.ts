import { App, Modal, Setting } from "obsidian"

export class EnterTextModal extends Modal {

  inputDescriptions: Array<{name: string, description: string}>
  cb: (result: Array<{name: string, value: string}>) => any
  result: Array<{name: string, value: string}>

  constructor(app: App, inputDescriptions: Array<{name: string, description: string}>, cb: (result: Array<{name: string, value: string}>) => any) {
    super(app)
    this.inputDescriptions = inputDescriptions
    this.cb = cb
    this.result = inputDescriptions.map(description => {
      return {
        name: description.name,
        value: ""
      }
    })
  }

  async onOpen() {
    for (let index = 0; index < this.inputDescriptions.length; index++) {
      const description = this.inputDescriptions[index];
      const setting = new Setting(this.contentEl)
      setting.setName(description.name)
      setting.setDesc(description.description)
      setting.addText(text => {
        text.onChange(value => {
          this.result[index].value = value
        })
      })
    }

    const buttons = new Setting(this.contentEl)
    buttons.addButton(button => {
      button.setButtonText("Cancel")
      button.onClick(() => {
        this.close()
        this.cb(this.result)
      })
    })

    buttons.addButton(button => {
      button.setButtonText("Go")
      button.setCta()
      button.onClick(() => {
        this.close()
        this.cb(this.result)
      })
    })
  }

  onClose(): void {
    this.cb(this.result)
  }
}
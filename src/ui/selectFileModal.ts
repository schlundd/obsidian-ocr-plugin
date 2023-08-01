import { rejects } from "assert";
import { App, SuggestModal, TFile } from "obsidian";
import * as path from "path";
import { FileConfiguration, InputDefinition } from "src/lib/validation";

export class SelectFileModal extends SuggestModal<TFile> {
  validFiles: TFile[]
  definition: InputDefinition
  cb: (file: TFile) => any
  selectedFile: TFile

  constructor(app: App, config: FileConfiguration, definiton: InputDefinition, cb: (file: TFile) => any) {
    super(app)
    this.cb = cb
    this.definition = definiton

    this.validFiles = this.app.vault.getFiles()

    if (config.sourceType === "selectFile" && config.pattern) {
      this.validFiles = this.validFiles.filter(file => {
        return file.path.match(config.pattern)
      })
    } else {
    }
  }

  onOpen() {
    super.onOpen()
    this.inputEl.placeholder = this.definition.description
  }

  getSuggestions(query: string): TFile[] {
    const filteredFiles = this.validFiles.filter((file) => {
      return file.path.toLowerCase().includes(query.toLowerCase())
    })
    return filteredFiles
  }

  renderSuggestion(value: TFile, el: HTMLElement) {
    const filePath = path.dirname(value.path)
    const smallHTML = filePath === "." ? "" : `<br/><small>${value.path}</small>`
    el.innerHTML = `${value.basename}.${value.extension}${smallHTML}`
  }

  selectSuggestion(value: TFile, evt: MouseEvent | KeyboardEvent): void {
    this.selectedFile = value
    super.selectSuggestion(value, evt)
  }

  onChooseSuggestion(item: TFile, evt: MouseEvent | KeyboardEvent) {
  }

  onClose(): void {
    this.cb(this.selectedFile)
  }

}
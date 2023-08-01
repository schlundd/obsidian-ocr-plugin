import { App, Plugin, Setting, TFile } from "obsidian"
import { FileConfiguration, InputDefinition } from "src/lib/validation"
import { SelectFileModal } from "./selectFileModal"
import { EnterTextModal } from "./enterTextModal"
import { ShowTextModal } from "./showTextModal"
import { WelcomeModal } from "./welcomeModal"
import { applySettings, getSettings, saveSettings, updateApiKey } from "src/lib/settings"
import { createRandomId } from "src/lib/tools"
import { addConfigurationFromURL, getMyConfigurationsFromServer } from "src/lib/flowConfigurations"

export const createStringEditInput = (container: HTMLElement, text: string, props: { name?: string, description?: string, onChange?: (value: string) => any }) => {
  const setting = new Setting(container)
  if (props.name) {
    setting.setName(props.name)
  }
  if (props.description) {
    setting.setDesc(props.description)
  }
  setting.addText(input => {
    input.setValue(text)
    if (props.onChange) {
      input.onChange(props.onChange)
    }
  })
  return setting
}

export const promtForFileSelection = async (app: App, config: FileConfiguration, definition: InputDefinition) => {
  return new Promise<TFile | void>((resolve) => {
    new SelectFileModal(app, config, definition, (file) => {
      resolve(file)
    }).open()
  })
}

export const promtForMultipleTextInputs = async (app: App, inputDescriptions: Array<{ name: string, description: string }>) => {
  return new Promise<Array<{ name: string, value: string }> | void>((resolve) => {
    new EnterTextModal(app, inputDescriptions, (result) => {
      resolve(result)
    }).open()
  })
}

export const showText = (app: App, text: string, title: string) => {
  new ShowTextModal(app, title, text).open()
}
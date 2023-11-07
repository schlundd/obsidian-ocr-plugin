import { Modal, Setting } from "obsidian";
import { Action, FlowConfiguration, FlowDefinition, InputConfiguration, InputDefinition, OutputDefinition, Trigger } from "src/lib/validation";
import { TaskbonePlugin } from "src/taskbonePlugin";
import { getCachedFlowDefinitionByURL, getFlowDefinitionByURL } from "src/lib/flowDefinitions";
import { getDefaultInputConfigurationForTypes } from "src/lib/flowConfigurations";
import { getDefaultForAction } from "src/lib/actions";
import { updateAndSaveConfiguration } from "src/lib/settings";
import { promptForFileSelection } from "./tools";
import { getDefaultTriggerForEvent } from "src/lib/trigger/onChange/triggers";

export class FlowConfigurationModal extends Modal {

  configuration: FlowConfiguration
  plugin: TaskbonePlugin

  constructor(configuration: FlowConfiguration, plugin: TaskbonePlugin) {
    super(plugin.app)
    this.plugin = plugin
    this.configuration = configuration

    this.configuration.triggers = this.configuration.triggers ?? []
  }

  async onOpen(): Promise<void> {
    this.titleEl.setText(this.configuration.command.name)
    FlowConfigurationModal.displayGeneralConfiguration(this.contentEl, this.configuration, this.plugin)

    const detailElement = document.createElement("div")
    this.contentEl.insertAdjacentElement("beforeend", detailElement)

    const actionsElement = document.createElement("div")
    this.contentEl.insertAdjacentElement("beforeend", actionsElement)
    
    const triggersElement = document.createElement("div")
    this.contentEl.insertAdjacentElement("beforeend", triggersElement)

    // paint with flow from cache
    getCachedFlowDefinitionByURL(this.plugin, this.configuration.flow).then((flow) => {
      if (flow) {
        FlowConfigurationModal.displayInputConfigurations(detailElement, flow, this.configuration, this.plugin)
        FlowConfigurationModal.displayActionSettings(actionsElement, this.configuration.resultActions, flow.outputDefinitions)
        FlowConfigurationModal.displayTriggerSettings(triggersElement, this.configuration.triggers!)
      }
    })

    // repaint when/if there is a new version available
    getFlowDefinitionByURL(this.plugin, this.configuration.flow).then((flow) => {
      if (flow) {
        FlowConfigurationModal.displayInputConfigurations(detailElement, flow, this.configuration, this.plugin)
        FlowConfigurationModal.displayActionSettings(actionsElement, this.configuration.resultActions, flow.outputDefinitions)
        FlowConfigurationModal.displayTriggerSettings(triggersElement, this.configuration.triggers!)
      }
    })

    const saveButton = new Setting(this.contentEl)
    saveButton.addButton(button => {
      button.setButtonText("Save settings")
      button.setCta()
      button.onClick(async () => {

        updateAndSaveConfiguration(this.plugin, this.configuration)
        this.close()
      })
    })

  }

  public static async displayGeneralConfiguration(container: HTMLElement, configuration: FlowConfiguration, plugin: TaskbonePlugin) {

    const nameSetting = new Setting(container)
    nameSetting.setName("Command Name")
    nameSetting.setDesc("The name of this command in the command list")
    nameSetting.addText(text => {
      text.setValue(configuration.command.name)
      text.onChange((name) => {
        configuration.command.name = name
      })
    })

    const descriptionSetting = new Setting(container)
    descriptionSetting.setName("Description")
    descriptionSetting.setDesc("The description you see in the taskbone command configuration")
    descriptionSetting.addTextArea(text => {
      text.setValue(configuration.command.description)
      text.onChange((value) => {
        configuration.command.description = value
      })
    })
  }

  public static async displayInputConfigurations(container: HTMLElement, flow: FlowDefinition, configuration: FlowConfiguration, plugin: TaskbonePlugin) {
    container.empty()
    new Setting(container).setName("Inputs").setHeading()
    for (const inputDefinition of flow.inputDefinitions) {
      let inputConfigurationIndex = configuration.inputConfigurations.findIndex(configuration => {
        return configuration.name === inputDefinition.name
      })
      if (inputConfigurationIndex === -1) {
        const newInputConfig = getDefaultInputConfigurationForTypes("constant", inputDefinition.type, inputDefinition.name)
        if (newInputConfig) {
          configuration.inputConfigurations.push()
          inputConfigurationIndex = configuration.inputConfigurations.length - 1
        }

      }

      const setting = new Setting(container)
      setting.setName(inputDefinition.name)
      setting.setDesc(inputDefinition.description)

      const detailedSettigsEl = document.createElement("div")
      setting.settingEl.insertAdjacentElement("afterend", detailedSettigsEl)
      FlowConfigurationModal.displayInputPropertySetting(plugin, detailedSettigsEl, configuration.inputConfigurations[inputConfigurationIndex], inputDefinition)

      setting.addDropdown((dropdown) => {
        if (inputDefinition.type === "string") {
          dropdown.addOptions({
            "constant": "Constant Text",
            "prompt": "Prompt for Text",
          })
        }
        dropdown.addOptions(
          {
            "activeFile": "Active File",
            "selectFile": "Prompt For File",
            "fixedFile": "Fixed File"
          }
        )
        dropdown.onChange(value => {
          const newInputConfig = getDefaultInputConfigurationForTypes(value, inputDefinition.type, inputDefinition.name)
          if (newInputConfig) {
            configuration.inputConfigurations[inputConfigurationIndex] = newInputConfig
            FlowConfigurationModal.displayInputPropertySetting(plugin, detailedSettigsEl, newInputConfig, inputDefinition)
          }
        })
        dropdown.setValue(configuration.inputConfigurations[inputConfigurationIndex].sourceType)
      })
    }
  }

  public static displayInputPropertySetting(plugin: TaskbonePlugin, container: HTMLElement, config: InputConfiguration, definition: InputDefinition) {
    container.empty()

    if (config.sourceType === "activeFile" || config.sourceType === "prompt") {
      // do nothing
    } else if (config.sourceType === "constant") {
      const textSetting = new Setting(container)
      textSetting.addTextArea(text => {
        text.setValue(config.value)
        text.onChange(value => {
          config.value = value
        })
      })
    } else if (config.sourceType === "fixedFile") {
      const pathSetting = new Setting(container)
      pathSetting.setName("Filepath")
      pathSetting.addText(text => {
        text.setValue(config.path)
        text.onChange(value => {
          config.path = value
        })

        pathSetting.addExtraButton(button => {
          button.setIcon("search")
          button.onClick(async () => {
            const file = await promptForFileSelection(app, config, definition)
            if (file) {
              text.setValue(file.path)
              config.path = file.path
            }
          })
        })
      })
    } else if (config.sourceType === "selectFile") {
      const patternSetting = new Setting(container)
      patternSetting.setName("Pattern")
      patternSetting.setDesc("Filepaths will be filtered based on this regular expression pattern.")
      patternSetting.addText(text => {
        text.setValue(config.pattern)
        text.onChange(value => {
          config.pattern = value
        })
      })
    }

  }


  public static displayActionSettings(el: HTMLElement, actions: Action[], outputDefinitions: Array<OutputDefinition>) {
    el.empty()

    new Setting(el).setName("Result Actions").setHeading()


    // actions

    const addResultButtonSetting = new Setting(el)
    addResultButtonSetting.addButton(button => {
      button.setButtonText("Add Action")
      button.setCta()
      button.onClick(click => {
        actions.push(getDefaultForAction("log"))
        FlowConfigurationModal.displayActionSettings(el, actions, outputDefinitions)
      })
    })

    for (let index = 0; index < actions.length; index++) {
      const action = actions[index]

      const actionSetting = new Setting(el)
      actionSetting.setName("Action Type")
      actionSetting.setDesc("What type of action should be performed")
      actionSetting.addDropdown(dropdown => {
        dropdown.addOptions({
          "log": "Log in developer console",
          "popup": "Open in Popup",
          "insertAtCursorPosition": "Insert at cursor position",
          "replaceActiveFile": "Replace active file",
          "createOrReplaceFile": "Create or replace file",
          "createOrAppendFile": "Create or append to file"
        })
        dropdown.onChange(value => {
          if (value === "log") {
            Object.assign(action, {
              action: "log",
              sourceType: "raw"
            } as Action)
          } else if (value === "popup") {
            Object.assign(action, {
              action: "popup",
              sourceType: "raw"
            } as Action)
          } else if (value === "insertAtCursorPosition") {
            Object.assign(action, {
              action: "insertAtCursorPosition",
              sourceType: "raw"
            } as Action)
          } else if (value === "replaceActiveFile") {
            Object.assign(action, {
              action: "replaceActiveFile",
              sourceType: "raw"
            })
          } else if (value === "createOrReplaceFile") {
            Object.assign(action, {
              action: "createOrReplaceFile",
              filePath: "",
              sourceType: "raw"
            })
          } else if (value === "createOrAppendFile") {
            Object.assign(action, {
              action: "createOrAppendFile",
              filePath: "",
              sourceType: "raw"
            })
          }
          FlowConfigurationModal.displayActionSettings(el, actions, outputDefinitions)
        })
        dropdown.setValue(action.action)
      })

      if (action.action === "createOrReplaceFile" || action.action === "createOrAppendFile") {
        const fileNameInputEl = document.createElement("div")
        actionSetting.settingEl.insertAdjacentElement("afterend", fileNameInputEl)
        const fileNameInput = new Setting(fileNameInputEl)
        fileNameInput.setName("Filename")
        fileNameInput.setDesc("The path of the file to write to. Supports javascript template strings with all inputs and outputs of the command.")
        fileNameInput.addText(textInput => {
          textInput.setValue(action.filePath)
          textInput.onChange(value => {
            action.filePath = value
          })
        })
      }

      if (["popup", "log", "insertAtCursorPosition", "replaceActiveFile", "createOrReplaceFile", "createOrAppendFile"].includes(action.action)) {
        const actionSourceSettingEl = document.createElement("div")
        actionSetting.settingEl.insertAdjacentElement("afterend", actionSourceSettingEl)
        const actionSourceSetting = new Setting(actionSourceSettingEl)
        actionSourceSetting.setName("Datasource")
        actionSourceSetting.setDesc("What do you want to show?")
        actionSourceSetting.addDropdown(dropdown => {
          dropdown.addOptions({
            "property": "A property from the output",
            "raw": "The raw output",
            "error": "Errors"
          })
          dropdown.setValue(action.sourceType)
          dropdown.onChange(value => {
            if (value === "raw" || value === "error") {
              actions[index] = getDefaultForAction(action.action)
              actions[index].sourceType = value
            } else if (value === "property") {
              actions[index] = getDefaultForAction(action.action)
              actions[index].sourceType = "property"
            }
            FlowConfigurationModal.displayActionSettings(el, actions, outputDefinitions)
          })
        })

        if (action.sourceType == "property") {
          const propertySettingEl = document.createElement("div")
          actionSourceSettingEl.insertAdjacentElement("afterend", propertySettingEl)

          const propertySetting = new Setting(propertySettingEl)
          propertySetting.setName("Property")
          propertySetting.addDropdown(dropdown => {
            const properties: Record<string, string> = {}
            outputDefinitions.forEach(outputDefinition => {
              properties[outputDefinition.name] = outputDefinition.description
            })
            dropdown.addOptions(properties)
            dropdown.onChange(value => {
              action.property = value
            })
          })
        }
      }

      const deleteActionSettingEl = document.createElement("div")
      el.insertAdjacentElement("beforeend", deleteActionSettingEl)
      const deleteActionSetting = new Setting(deleteActionSettingEl)
      deleteActionSetting.addButton(button => {
        button.setButtonText("Remove action")
        button.setWarning()
        button.onClick(click => {
          actions.splice(index, 1)
          FlowConfigurationModal.displayActionSettings(el, actions, outputDefinitions)
        })
      })
    }
  }

  public static displayTriggerSettings(el: HTMLElement, triggers: Trigger[]) {
    el.empty()

    new Setting(el).setName("Run command automatically").setHeading()

    // actions

    const addTriggerButtonSetting = new Setting(el)
    addTriggerButtonSetting.addButton(button => {
      button.setButtonText("Add Trigger")
      button.setCta()
      button.onClick(click => {
        triggers.push(getDefaultTriggerForEvent("fileOpen"))
        FlowConfigurationModal.displayTriggerSettings(el, triggers)
      })
    })

    for (let index = 0; index < triggers.length; index++) {
      const trigger = triggers[index]

      const triggerSetting = new Setting(el)
      triggerSetting.setName("Event")
      triggerSetting.setDesc("What type of event should trigger the command")
      triggerSetting.addDropdown(dropdown => {
        dropdown.addOptions({
          "fileOpen": "Open a file"
        })
        dropdown.onChange(value => {
          if(value === "fileOpen") {
            Object.assign(trigger, getDefaultTriggerForEvent(value))
          }
          FlowConfigurationModal.displayTriggerSettings(el, triggers)

        })
        dropdown.setValue(trigger.event)
      })

      if (trigger.event === "fileOpen") {
        const conditionInputEl = document.createElement("div")
        triggerSetting.settingEl.insertAdjacentElement("afterend", conditionInputEl)
        const conditionInput = new Setting(conditionInputEl)
        conditionInput.setName("Condition")
        conditionInput.setDesc("Optional condition")
        conditionInput.addTextArea(textInput => {
          textInput.setValue(trigger.condition)
          textInput.onChange(value => {
            trigger.condition = value
          })
        })
      }

      if (trigger.event === "fileOpen") {

        const frequencyInputElement = document.createElement("div")
        triggerSetting.settingEl.insertAdjacentElement("afterend", frequencyInputElement)
        const frequencySetting = new Setting(frequencyInputElement)
        frequencySetting.setName("Frequency")
        frequencySetting.setDesc("How often should the command run")
        frequencySetting.addDropdown(dropdown => {
          dropdown.addOptions({
            "oncePerFileAndSession": "Once per file and Obsidian session"
          })
          dropdown.onChange(value => {
            if(value === "oncePerFileAndSession") {
              trigger.frequency = value
            }
            FlowConfigurationModal.displayTriggerSettings(el, triggers)

          })
          dropdown.setValue(trigger.frequency)
        })
      }

      const deleteTriggerSettingEl = document.createElement("div")
      el.insertAdjacentElement("beforeend", deleteTriggerSettingEl)
      const deleteActionSetting = new Setting(deleteTriggerSettingEl)
      deleteActionSetting.addButton(button => {
        button.setButtonText("Remove trigger")
        button.setWarning()
        button.onClick(click => {
          triggers.splice(index, 1)
          FlowConfigurationModal.displayTriggerSettings(el, triggers)
        })
      })
    }
  }
}
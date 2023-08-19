import { PluginSettingTab, Setting } from "obsidian";
import { register, unregister } from "src/lib/commands";
import { addConfigurationFromURL, duplicateWithNewCommand } from "src/lib/flowConfigurations";
import { applySettings, connectToAccount, getApiKey, getSettings, saveSettings, updateApiKey } from "src/lib/settings";
import { FlowConfiguration, Settings } from "src/lib/validation";
import { TaskbonePlugin } from "src/taskbonePlugin";
import { FlowConfigurationModal } from "./flowConfigurationModal";
import { promptForMultipleTextInputs } from "./tools";

export class TaskboneSettingsTab extends PluginSettingTab {

  plugin: TaskbonePlugin

  constructor(plugin: TaskbonePlugin) {
    super(plugin.app, plugin)
    this.plugin = plugin
  }

  public async display() {
    const settings = await getSettings(this.plugin)
    TaskboneSettingsTab.displaySettings(this.containerEl, settings, this.plugin)
  }

  private static async displaySettings(container: HTMLElement, settings: Settings, plugin: TaskbonePlugin) {
    container.empty()
    container.createEl('h2', {
      text: "Taskbone Settings"
    })
    new Setting(container).setName("Commands").setHeading()
    for (const flowConfiguration of settings.flowConfigurations) {
      const setting = new Setting(container)
      setting.setName(flowConfiguration.command.name)
      setting.setDesc(flowConfiguration.command.description)
      setting.addButton((button) => {
        button.setButtonText('Duplicate')
        button.onClick(async () => {
          const duplicate = duplicateWithNewCommand(flowConfiguration)
          settings.flowConfigurations.push(duplicate)
          register(duplicate.command, plugin)
          await saveSettings(settings, plugin)
          TaskboneSettingsTab.displaySettings(container, settings, plugin)
        })
      })
      setting.addButton((button) => {
        button.setIcon("trash")
        button.setWarning()
        button.onClick(async () => {
          unregister(flowConfiguration.command, plugin.manifest.id, app)
          settings.flowConfigurations = settings.flowConfigurations.filter((config) => {
            return config.command.id !== flowConfiguration.command.id
          })
          await saveSettings(settings, plugin)
          TaskboneSettingsTab.displaySettings(container, settings, plugin)
        })
      })
      setting.addButton((button) => {
        button.setIcon("gear")
        button.setCta()
        button.onClick(event => {
          const modal = new FlowConfigurationModal(JSON.parse(JSON.stringify(flowConfiguration)) as FlowConfiguration, plugin)
          modal.open()
          modal.onClose = async () => {
            settings = await getSettings(plugin)
            TaskboneSettingsTab.displaySettings(container, settings, plugin)
          }
        })
      })
    }

    new Setting(container).setName("Account").setHeading()
    if(!settings.apiKey) {
      const setting = new Setting(container)
      setting.setName("Connect with your Taskbone account")
      setting.descEl.innerHTML = 'See <a href="https://app.taskbone.com">Taskbone</a> for more information.'
      setting.addButton((button) => {
        button.setButtonText('Connect')
        button.onClick(async () => {
          await connectToAccount(plugin)
          const settings = await getSettings(plugin)
          TaskboneSettingsTab.displaySettings(container, settings, plugin)
        })
      })
      setting.addButton((button) => {
        button.setButtonText('Add Secret key manually')
        button.onClick(async () => {
          const inputs = await promptForMultipleTextInputs(app, [{
            description: "The secret key you received from Taskbone. Use only if automatic connection does not work.",
            name: "Secret Key"
          }])
          if (inputs && inputs.length === 1) {
            await connectToAccount(plugin, inputs[0].value)
            const settings = await getSettings(plugin)
            TaskboneSettingsTab.displaySettings(container, settings, plugin)
          }
        })
      })
    } else {
      const setting = new Setting(container).setName("Manage your account")
      const home = new URL('/users/home', settings.baseUrl)
      setting.descEl.innerHTML = `Visit <a href="${home.toString()}">Taskbone</a> for more information.`
    }

    const importCommandSetting = new Setting(container)
    importCommandSetting.setName("Import Command from URL")
    importCommandSetting.setDesc("Add a new command by importing settings from a URL")

    let commandURL: string
    importCommandSetting.addText(input => {
      input.setPlaceholder('command URL')
      input.setValue(commandURL)
      input.onChange(value => {
        commandURL = value
      })
    })

    importCommandSetting.addButton(button => {
      button.setButtonText("Import Command")
      button.onClick(async () => {
        // new ImportCommandByURLModal(this).open()
        const newSettings = await addConfigurationFromURL(commandURL, settings)
        await saveSettings(newSettings, plugin)
        await applySettings(newSettings, plugin)
        TaskboneSettingsTab.displaySettings(container, newSettings, plugin)
      })
    })
  }
}
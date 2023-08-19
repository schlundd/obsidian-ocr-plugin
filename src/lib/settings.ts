import { Plugin } from "obsidian";
import { FlowConfiguration, Settings, validateSettings } from "./validation";
import { registerAll, unregisterAll } from "./commands";
import { createRandomId } from "./tools";
import { WelcomeModal } from "src/ui/welcomeModal";
import { showText } from "src/ui/tools";
import { addConfigurationFromURL, getMyConfigurationsFromServer } from "./flowConfigurations";


let settings: Settings

export const getSettings = async (plugin: Plugin) => {
  if (!settings) {
    let data = await plugin.loadData()
    if (!data) {
      data = JSON.parse(JSON.stringify(getDefaultSettings(plugin)))
    }
    if (validateSettings(data)) {
      settings = data
    } else {
      return getDefaultSettings(plugin)
    }
  }
  return JSON.parse(JSON.stringify(settings)) as Settings
}

export const saveSettings = async (newSettings: Settings, plugin: Plugin) => {
  settings = JSON.parse(JSON.stringify(newSettings))
  await plugin.saveData(settings)
}

export const applySettings = async (settings: Settings, plugin: Plugin) => {
  unregisterAll(plugin.manifest.id, app)
  registerAll(settings.flowConfigurations.map((flowConfiguration) => { return flowConfiguration.command }), plugin)
}

export const updateApiKey = async (plugin: Plugin, newKey: string) => {
  const settings = await getSettings(plugin)
  settings.apiKey = newKey
  await saveSettings(settings, plugin)
}

export const getApiKey = async (plugin: Plugin) => {
  let apiKey = (await (getSettings(plugin))).apiKey
  if(!apiKey) {
    apiKey = await connectToAccount(plugin)
  }
  return apiKey
}

export const updateAndSaveConfiguration = async (plugin: Plugin, configuration: FlowConfiguration) => {

  const settings = await getSettings(plugin)
  const index = settings.flowConfigurations.findIndex(storedConfig => {
    return (storedConfig.command.id === configuration.command.id)
  })

  if (index != -1){
    settings.flowConfigurations[index] = configuration
  }

  await saveSettings(settings, plugin)
  await applySettings(settings, plugin)

}


export const getDefaultSettings = (plugin: Plugin): Settings => {
  return {
    version: plugin.manifest.version,
    baseUrl: "https://app.taskbone.com",
    flowConfigurations: [],
    flowDefinitions: []
  }
}

export const connectToAccount = async (plugin: Plugin, key?: string) => {
  const app = plugin.app

  const baseUrl = (await getSettings(plugin)).baseUrl

  const code = createRandomId()

  const apiUrl = new URL(`/integrations/obsidian/connect/${code}`, baseUrl).toString()
  const pageUrl = new URL(`/integrations/obsidian/welcome/${code}`, baseUrl).toString()

  key = key ?? await new Promise<string>((resolve) => {
    new WelcomeModal(app, apiUrl, pageUrl, (key: string) => {
      resolve(key)
    }).open()
  })

  if (key) {
    await updateApiKey(plugin, key)

    const configs = await getMyConfigurationsFromServer(plugin, key)

    let settings = await getSettings(plugin)
    console.log(configs)
    for (const config of configs) {
      settings = await addConfigurationFromURL(config, settings)
    }

    await saveSettings(settings, plugin)
    await applySettings(settings, plugin)

    showText(app, "Your Taskbone account is now connected.", "Success")

    return (key)
  } else {
    if (!(await getSettings(plugin)).apiKey) {
      showText(app, "Your Taskbone account was NOT connected. Check the Taskbone plugin settings to try again.", "Something went wrong.")
    }
  }
}
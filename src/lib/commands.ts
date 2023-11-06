import { App, Plugin } from "obsidian"
import { executeFlowConfiguration } from "./flowConfigurations"
import { getSettings } from "./settings"

export const unregister = (command: { id: string }, pluginId: string, app: App) => {
  try {
    const anyApp = app as any
    const commandId = `${pluginId}:${command.id}`
    if (anyApp.commands.findCommand(commandId)) {
      anyApp.commands.removeCommand(commandId)
    }
  } catch (error) {
    console.log(error)
  }
}

export const unregisterAll = (pluginId: string, app: App) => {
  try {
    const anyApp = app as any
    const commands = anyApp.commands.listCommands() as Array<{ id: string }>
    for (const command of commands) {
      if (command.id.startsWith(pluginId + ':')) {
        anyApp.commands.removeCommand(command)
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export const register = (command: { id: string, name: string }, plugin: Plugin) => {
  console.log("register command: " + command.name)
  plugin.addCommand({
    id: command.id,
    name: command.name,
    callback: async () => {
      execute(command, plugin)
    }
  })
}

export const registerAll = (commands: Array<{ id: string, name: string }>, plugin: Plugin) => {
  for (const command of commands) {
    register(command, plugin)
  }
}

export const execute = async (command: { id: string }, plugin: Plugin) => {
  console.log("execute: ")
  console.log(JSON.stringify(command, null, 2))
  const settings = await getSettings(plugin)
  const config = settings.flowConfigurations.find(config => {
    return (config.command.id === command.id)
  })
  if (config) {
    executeFlowConfiguration(plugin, config)
  }
}
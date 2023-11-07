import { App, Plugin, TFile } from "obsidian"
import { listeners } from "src/lib/data/listeners";
import { executeFlowConfiguration } from "src/lib/flowConfigurations";
import { booleanFromConditionString } from "src/lib/tools";
import { Settings, Trigger } from "src/lib/validation";
import {fileOpenTriggerList} from "src/lib/data/triggers"


export const getListOfTriggerEvents = (settings: Settings) => {
  const events: Record<string, boolean> = {}
  for (const configuration of settings.flowConfigurations) {
    if (!configuration.triggers) continue;
    for (const trigger of configuration.triggers) {
      if (trigger.event === "fileOpen") {
        events[trigger.event] = true
      }
    }
  }
  return events
}

export const registerTriggers = (settings: Settings, plugin: Plugin) => {
  const events = getListOfTriggerEvents(settings)
  console.log(events)
  if (events.fileOpen) {
    console.log("registering")
    listeners.push(plugin.app.workspace.on("file-open", async (file) => {
      console.log("open")
      if (file) {
        await checkAndExecuteFileOpenTriggers(file, plugin, settings)
      }
    }))
  }
}

export const removeTriggers = (app: App) => {
  for (const listener of listeners) {
    app.workspace.offref(listener)
  }
}

export const checkAndExecuteFileOpenTriggers = async (file: TFile, plugin: Plugin, settings: Settings) => {

  const configurations = settings.flowConfigurations
  const content = await plugin.app.vault.read(file)

  for (const configuration of configurations) {
    if (!configuration.triggers) continue;
    for (const trigger of configuration.triggers) {
      if (trigger.event != "fileOpen") break;
      try {
        const conditionMet = booleanFromConditionString(trigger.condition, { content })
        if (!conditionMet) break;
        if (trigger.frequency === "oncePerFileAndSession") {
          const triggerID = configuration.command.id + '______' + file.path
          const triggeredAlready = fileOpenTriggerList.contains(triggerID)
          if (triggeredAlready) {
            console.log("Triggered already: " + triggerID)
            break
          }
          fileOpenTriggerList.push(triggerID)
        }
        executeFlowConfiguration(plugin, configuration)
        break;

      } catch (error) {
        console.log(error)
      }
    }
  }
}

export const getDefaultTriggerForEvent = (event: "fileOpen") => {
  return {
    condition: "",
    event,
    frequency: "oncePerFileAndSession"
  } satisfies Trigger
}
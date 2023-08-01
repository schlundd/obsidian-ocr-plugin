import { Plugin, requestUrl } from "obsidian"
import { getSettings, saveSettings } from "./settings"
import { FlowDefinition, validateFlowDefinition } from "./validation"

export const getCachedFlowDefinitions = async (plugin: Plugin) => {
  const settings = await getSettings(plugin)
  return settings?.flowDefinitions || []
}

export const getCachedFlowDefinitionByURL = async (plugin: Plugin, url: string): Promise<FlowDefinition | undefined> => {
  const definitions = await getCachedFlowDefinitions(plugin)
  let matching: FlowDefinition | undefined = definitions.find(definition => {
    return definition.url === url
  })

  if (!matching) {
    matching = await getFlowDefinitionByURL(plugin, url)
    if (matching){
      const settings = await getSettings(plugin)
      settings.flowDefinitions.push(matching)
      await saveSettings(settings, plugin)
    }
  }

  return matching
}

export const getFlowDefinitionByURL = async (plugin: Plugin, url: string) => {
  console.log("Loading flow from: " + url)
  try {
    const response = await requestUrl({
      url
    })
    const content = response.json
    if (validateFlowDefinition(content)) {
      return content
    } else {
      return getCachedFlowDefinitionByURL(plugin, url)
    }
  } catch (error) {
    console.log("Could not get flowDefinition from: " + url)
    console.log(error)
    console.log("Using cached version")
    return getCachedFlowDefinitionByURL(plugin, url)
  }

}
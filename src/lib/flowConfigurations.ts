import { App, arrayBufferToBase64, MarkdownView, Plugin, requestUrl, Setting, TFile } from "obsidian";
import { createRandomId, stringFromTemplateString } from "./tools";
import { FlowConfiguration, InputConfiguration, validateApiResponse, APIResponse, Settings, validateFlowConfiguration } from "./validation";
import { getCachedFlowDefinitionByURL, getFlowDefinitionByURL } from "./flowDefinitions";
import { promtForFileSelection, promtForMultipleTextInputs, showText } from "src/ui/tools";
import { getApiKey, getSettings } from "./settings";

interface FlowInput {
  constants: Record<string, string>
  records: Record<string, string>[]
}

export const duplicateWithNewCommand = (configuration: FlowConfiguration) => {
  const copy = JSON.parse(JSON.stringify(configuration)) as FlowConfiguration
  copy.command.name = `Copy of ${copy.command.name}`
  copy.command.id = createRandomId()
  return copy
}

export const getDefaultInputConfigurationForTypes = (sourceType: string, type: "string" | "binary/base64", name: string): InputConfiguration | undefined => {
  if (sourceType === "constant" && type === "string") {
    return {
      type,
      sourceType: "constant",
      name,
      value: ""
    }
  }
  if (sourceType === "activeFile") {
    return {
      type,
      sourceType,
      name
    }
  }
  if (sourceType === "selectFile") {
    return {
      sourceType,
      isRegularExpression: true,
      name,
      pattern: (type === 'string') ? "\\.md$" : "\\.(png|jpg|jpeg|gif)$",
      autoRunOnCreate: false,
      type
    }
  }
  if (sourceType === "fixedFile") {
    return {
      sourceType,
      name,
      path: "",
      type
    }
  }
  if (sourceType === "prompt" && type === "string") {
    return {
      sourceType,
      name,
      type
    }
  }

}

const getAdditionalFileData = (prefix: string, file: TFile, app: App) => {
  const data: Record<string, string> = {}
  data[`${prefix}/obsidian/vaultName`] = app.vault.getName()
  data[`${prefix}/obsidian/metadata`] = JSON.stringify(app.metadataCache.getFileCache(file))
  data[`${prefix}/obsidian/filePath`] = file.path
  data[`${prefix}/obsidian/fileBaseName`] = file.basename
  data[`${prefix}/obsidian/fileExtension`] = file.extension
  if (file.parent) {
    data[`${prefix}/obsidian/fileParentPath`] = file.parent?.path
  }
  return data
}

export const executeFlowConfiguration = async (plugin: Plugin, configuration: FlowConfiguration) => {

  const app = plugin.app
  const activeFile = app.workspace.getActiveFile()

  // Prepare Inputs

  const input: FlowInput = {
    constants: {},
    records: []
  }

  const flow = await getCachedFlowDefinitionByURL(plugin, configuration.flow)
  if (!flow) {
    throw new Error("Can not find flow for command?")
  }
  let prompts: Array<string> = []

  for (const inputConfig of configuration.inputConfigurations) {
    const type = inputConfig.sourceType
    if (type === "constant") {
      input.constants[inputConfig.name] = inputConfig.value
    } else if (type === "activeFile") {
      if (!activeFile) {
        input.constants[inputConfig.name] = ""
      } else {
        if (inputConfig.type === "string") {
          const view = app.workspace.getActiveViewOfType(MarkdownView)
          if (view) {
            input.constants[inputConfig.name] = view.data
          } else {
            input.constants[inputConfig.name] = await app.vault.read(activeFile)
          }
        } else if (inputConfig.type === "binary/base64") {
          const binaryContent = await app.vault.readBinary(activeFile)
          const base64Content = arrayBufferToBase64(binaryContent)
          input.constants[inputConfig.name] = base64Content
        }
        Object.assign(input.constants, getAdditionalFileData(inputConfig.name, activeFile, app))
      }
    } else if (type === "fixedFile") {
      const file = app.vault.getAbstractFileByPath(inputConfig.path) as TFile
      if (file) {
        if (inputConfig.type === 'binary/base64') {
          const binaryContent = await app.vault.readBinary(file)
          const base64Content = arrayBufferToBase64(binaryContent)
          input.constants[inputConfig.name] = base64Content
        } else {
          input.constants[inputConfig.name] = await app.vault.read(file);
        }
        Object.assign(input.constants, getAdditionalFileData(inputConfig.name, file, app))
      }
    } else if (type === "selectFile") {
      const definition = flow.inputDefinitions.find(definition => {
        return (definition.name === inputConfig.name)
      })
      if (definition) {
        const file = await promtForFileSelection(app, inputConfig, definition)
        console.log("chose file: ")
        console.log(file)
        if (file) {
          if (inputConfig.type === 'binary/base64') {
            const binaryContent = await app.vault.readBinary(file)
            const base64Content = arrayBufferToBase64(binaryContent)
            input.constants[inputConfig.name] = base64Content
          } else {
            input.constants[inputConfig.name] = await app.vault.read(file);
          }
          Object.assign(input.constants, getAdditionalFileData(inputConfig.name, file, app))
        }
      }
    } else if (type === "prompt") {
      prompts.push(inputConfig.name)
    }
  }

  if (prompts.length > 0) {
    const promptTexts = prompts.map(name => {
      const definition = flow.inputDefinitions.find(definition => {
        return (definition.name === name)
      })
      if (definition) {
        return {
          name,
          description: definition.description
        }
      }
      return {
        name,
        description: ""
      }
    })

    const proptResults = await promtForMultipleTextInputs(app, promptTexts)
    if (proptResults) {
      for (const result of proptResults) {
        input.constants[result.name] = result.value
      }
    }

  }

  const status = plugin.addStatusBarItem()

  status.setText(`Running: ${configuration.command.name}`)

  const result = await execute(input, flow.url, plugin)

  status.setText(`Finished: ${configuration.command.name}`)

  setTimeout(() => {
    status.remove()
  }, 3000)

  for (const action of configuration.resultActions) {
    let output = ""
    if (action.sourceType === "error") {
      if (result.errors && result.errors.length > 0) {
        output = JSON.stringify(result.errors, null, 2)
      }
    } else if (action.sourceType === "raw") {
      output = JSON.stringify(result, null, 2)
    } else if (action.sourceType === "property") {
      if (result.constants) {
        output = result.constants[action.property] ?? ''
      } else if (result.records && result.records.length > 0) {
        const record = result.records[0]
        output = record[action.property] ?? ""
      }
    }
    if (output) {
      if (action.action === "log") {
        console.log(output)
      } else if (action.action === 'popup') {
        showText(app, output, configuration.command.name)
      } else if (action.action === 'insertAtCursorPosition') {
        const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor
        if (editor) {
          editor.replaceSelection(output)
        }
      } else if (action.action === 'replaceActiveFile' && activeFile) {
        app.vault.modify(activeFile, output)
      } else if (action.action === 'createOrReplaceFile' || action.action === 'createOrAppendFile') {
        const filePathTemplate = action.filePath
        const filePath = stringFromTemplateString(filePathTemplate, { input: input.constants, output: result })
        const vault = app.vault
        const adapter = vault.adapter
        const fileExists = await adapter.exists(filePath)
        if (!fileExists) {
          console.log(`creating ${filePath}`)
          vault.create(filePath, output)
        } else {
          console.log(`updating ${filePath}`)
          const file = app.vault.getAbstractFileByPath(filePath)
          if (file instanceof TFile) {
            if (action.action === "createOrReplaceFile") {
              await vault.modify(file, output)
            } else if (action.action === "createOrAppendFile") {
              await vault.append(file, output)
            }
          }
        }
      }
    }
  }
}

export const execute = async (inputs: FlowInput, flow: string, plugin: Plugin): Promise<APIResponse> => {

  const apiKey = await getApiKey(plugin)
  if (!apiKey) {
    showText(plugin.app, "Your plugin is not connected to a Taskbone account", "Could not execute command")
  }
  const settings = await getSettings(plugin)

  const url = new URL('/api/v1/execute', settings.baseUrl)
  url.searchParams.append('id', flow)

  try {
    const response = await requestUrl({
      url: url.toString(),
      method: "post",
      contentType: "application/json",
      body: JSON.stringify(inputs),
      headers: {
        "authorization": `Bearer ${apiKey}`
      },
      throw: false
    })
    if (response.status == 200) {

      const resultContent = response.json
      if (validateApiResponse(resultContent)) {
        return resultContent
      }
    } else if (response.status == 401) {
      return {
        errors: [
          "Unauthorized"
        ]
      }
    } else {
      return {
        errors: [`${response.status} ${response.text}`]
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      return {
        errors: [e.message]
      }
    } else {
      return {
        errors: [JSON.stringify(e)]
      }
    }
  }
  return {
    errors: ["No Response"]
  }
}

export const getMyConfigurationsFromServer = async (plugin: Plugin, apiKey: string) => {
  const settings = await getSettings(plugin)

  const url = new URL('/integrations/obsidian/commands', settings.baseUrl)

  try {
    const response = await requestUrl({
      url: url.toString(),
      method: "get",
      contentType: "application/json",
      headers: {
        "authorization": `Bearer ${apiKey}`
      },
      throw: false
    })
    return response.json as Array<string>
  } catch (e) {
    console.log(e)
  }
  return []
}

export const addConfigurationFromURL = async (url: string, oldSettings: Settings) => {

  const settings = JSON.parse(JSON.stringify(oldSettings)) as Settings

  try {
    const response = await requestUrl({
      url: url.toString(),
      method: "get",
      contentType: "application/json",
      throw: false
    })
    
    const config = response.json

    if(!validateFlowConfiguration(config)) {
      console.log(validateFlowConfiguration.errors)
      return settings
    }

    config.command.id = createRandomId()

    settings.flowConfigurations.push(config)

    return settings

  } catch (e) {
    console.log(e)
    return settings
  }



}
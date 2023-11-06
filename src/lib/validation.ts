import Ajv, { JSONSchemaType } from "ajv"
const ajv = new Ajv({
  logger: {
    error: console.log.bind(console),
    log: console.log.bind(console),
    warn: console.log.bind(console)
  }
})

export interface InputDefinition {
  name: string,
  description: string,
  type: "binary/base64" | "string"
}

const inputDefinitionSchema: JSONSchemaType<InputDefinition> = {
  type: "object",
  properties: {
    name: {
      type: "string"
    },
    description: {
      type: "string"
    },
    type: {
      type: "string",
      enum: [
        "binary/base64", "string"
      ]
    }
  },
  required: ["description", "name", "type"]
}

export interface OutputDefinition {
  name: string,
  description: string
}

const outputDefinitionSchema: JSONSchemaType<OutputDefinition> = {
  type: "object",
  properties: {
    name: {
      type: "string"
    },
    description: {
      type: "string"
    }
  },
  required: ["description", "name"]
}

export interface FlowDefinition {
  id: string,
  name: string,
  description: string,
  url: string,
  inputDefinitions: Array<InputDefinition>,
  outputDefinitions: Array<OutputDefinition>
}

const flowDefinitionSchema: JSONSchemaType<FlowDefinition> = {
  type: "object",
  properties: {
    id: {
      type: "string"
    },
    name: {
      type: "string"
    },
    description: {
      type: "string"
    },
    url: {
      type: "string"
    },
    inputDefinitions: {
      type: "array",
      items: inputDefinitionSchema
    },
    outputDefinitions: {
      type: "array",
      items: outputDefinitionSchema
    }
  },
  additionalProperties: true,
  required: ["description", "id", "inputDefinitions", "name", "outputDefinitions", "url"]
}

export type StringInputPrompt = {
  type: "string",
  sourceType: "prompt"
}

const stringInputPromptSchema: JSONSchemaType<StringInputPrompt> = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "string"
    },
    sourceType: {
      type: "string",
      const: "prompt"
    }
  },
  required: ["sourceType", "type"]
}

export type StringInputActiveFileContentConfiguration = {
  type: "string"
  sourceType: "activeFile"
}

const stringInputActiveFileContentConfigurationSchema: JSONSchemaType<StringInputActiveFileContentConfiguration> = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "string"
    },
    sourceType: {
      type: "string",
      const: "activeFile"
    }
  },
  required: ["sourceType", "type"]
}

export type StringInputConstantConfiguration = {
  type: "string"
  sourceType: "constant"
  value: string
}

const stringInputConstantConfigurationSchema: JSONSchemaType<StringInputConstantConfiguration> = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "string"
    },
    sourceType: {
      type: "string",
      const: "constant"
    },
    value: {
      type: "string"
    }
  },
  required: ["sourceType", "type", "value"]
}


export type StringInputFixedFileConfiguration = {
  type: "string"
  sourceType: "fixedFile"
  path: string
}

const stringInputFixedFileConfigurationSchema: JSONSchemaType<StringInputFixedFileConfiguration> = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "string"
    },
    sourceType: {
      type: "string",
      const: "fixedFile"
    },
    path: {
      type: "string"
    }
  },
  required: ["sourceType", "type", "path"]
}

export type StringInputPromptFileConfiguration = PromptFileConfiguration & {
  type: "string"
}

const stringInputPromptFileConfigurationSchema: JSONSchemaType<StringInputPromptFileConfiguration> = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "string"
    },
    sourceType: {
      type: "string",
      const: "selectFile"
    },
    pattern: {
      type: "string"
    },
    isRegularExpression: {
      type: "boolean"
    },
    autoRunOnCreate: {
      type: "boolean",
      nullable: true
    }
  },
  required: ["type", "isRegularExpression", "pattern", "sourceType"]
}


export type BinaryInputActiveFileContentConfiguration = {
  type: "binary/base64"
  sourceType: "activeFile"
}

const binaryInputActiveFileContentConfigurationSchema: JSONSchemaType<BinaryInputActiveFileContentConfiguration> = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "binary/base64"
    },
    sourceType: {
      type: "string",
      const: "activeFile"
    }
  },
  required: ["sourceType", "type"]
}

export type BinaryInputFixedFileConfiguration = {
  type: "binary/base64"
  sourceType: "fixedFile"
  path: string
}

const binaryInputFixedFileConfigurationSchema: JSONSchemaType<BinaryInputFixedFileConfiguration> = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "binary/base64"
    },
    sourceType: {
      type: "string",
      const: "fixedFile"
    },
    path: {
      type: "string"
    }
  },
  required: ["sourceType", "type", "path"]
}

export type BinaryInputPromptFileConfiguration = PromptFileConfiguration & {
  type: "binary/base64"
}

const binaryInputPromptFileConfigurationSchema: JSONSchemaType<BinaryInputPromptFileConfiguration> = {
  type: "object",
  properties: {
    type: {
      type: "string",
      const: "binary/base64"
    },
    sourceType: {
      type: "string",
      const: "selectFile"
    },
    pattern: {
      type: "string"
    },
    isRegularExpression: {
      type: "boolean"
    },
    autoRunOnCreate: {
      type: "boolean",
      nullable: true
    }
  },
  required: ["type", "isRegularExpression", "pattern", "sourceType"]
}

export type PromptFileConfiguration = {
  sourceType: "selectFile"
  pattern: string
  isRegularExpression: true
  autoRunOnCreate?: boolean
}


export type InputConfiguration = { name: string } & (StringInputConfiguration | BinaryInputConfiguration)

export type StringInputConfiguration = StringInputConstantConfiguration |
  StringInputActiveFileContentConfiguration |
  StringInputPrompt |
  StringInputPromptFileConfiguration |
  StringInputFixedFileConfiguration

export type BinaryInputConfiguration = BinaryInputActiveFileContentConfiguration |
  BinaryInputFixedFileConfiguration |
  BinaryInputPromptFileConfiguration

export type FileConfiguration = StringInputPromptFileConfiguration |
  StringInputFixedFileConfiguration |
  BinaryInputFixedFileConfiguration |
  BinaryInputPromptFileConfiguration

const inputConfigurationSchema: JSONSchemaType<InputConfiguration> = {
  type: "object",
  allOf: [
    {
      type: "object",
      properties: {
        "name": {
          type: "string"
        }
      },
      required: ["name"]
    },
    {
      anyOf: [
        stringInputConstantConfigurationSchema,
        stringInputActiveFileContentConfigurationSchema,
        stringInputPromptSchema,
        stringInputPromptFileConfigurationSchema,
        stringInputFixedFileConfigurationSchema,
        binaryInputActiveFileContentConfigurationSchema,
        binaryInputFixedFileConfigurationSchema,
        binaryInputPromptFileConfigurationSchema
      ]
    }
  ],
  required: []
}

interface Command {
  id: string,
  name: string,
  description: string
}

const commandSchema: JSONSchemaType<Command> = {
  type: "object",
  properties: {
    description: {
      type: "string"
    },
    id: {
      type: "string"
    },
    name: {
      type: "string"
    }
  },
  required: ["description", "id", "name"]
}

export type ActionType = 'log' | 'popup' | 'insertAtCursorPosition' | 'replaceActiveFile' | 'createOrReplaceFile' | 'createOrAppendFile'

export type Action = (LogAction | PopupAction | InsertAtCurserAction | ReplaceActiveFileAction | ReplaceFileAction | AppendFileAction) & (ActionOnError | ActionOnProperty | ActionOnRaw)

export interface LogAction {
  action: 'log'
}

export interface PopupAction {
  action: 'popup'
}

export interface InsertAtCurserAction {
  action: 'insertAtCursorPosition'
}

export interface ReplaceActiveFileAction {
  action: 'replaceActiveFile'
}

export interface ReplaceFileAction {
  action: 'createOrReplaceFile'
  filePath: string
}
export interface AppendFileAction {
  action: 'createOrAppendFile'
  filePath: string
}

export interface ActionOnRaw {
  sourceType: 'raw'
}

export interface ActionOnError {
  sourceType: 'error'
}

export interface ActionOnProperty {
  sourceType: 'property',
  property: string
}

const actionSchema: JSONSchemaType<Action> = {
  type: "object",
  allOf: [
    {
      anyOf: [
        {
          properties: {
            action: {
              type: "string",
              enum: ["insertAtCursorPosition", "log", "popup", "replaceActiveFile"]
            }
          },
          required: ["action"]
        },
        {
          properties: {
            action: {
              type: "string",
              enum: ["createOrAppendFile", "createOrReplaceFile"]
            },
            filePath: {
              type: "string"
            }
          },
          required: ["action", "filePath"]
        }
      ]
    },
    {
      anyOf: [
        {
          properties: {
            sourceType: {
              type: "string",
              enum: ["error", "raw"]
            }
          },
          required: ["sourceType"]
        },
        {
          properties: {
            sourceType: {
              type: "string",
              const: "property"
            },
            property: {
              type: "string"
            }
          },
          required: ["sourceType", "property"]
        }
      ]
    }
  ],
  required: []
}

export interface Trigger {
  event: "fileOpen",
  condition: string,
  frequency: "oncePerFileAndSession"
}

const triggerSchema: JSONSchemaType<Trigger> = {
  type: "object",
  properties: {
    condition: {
      type: "string"
    },
    event: {
      type: "string",
      enum: ["fileOpen"]
    },
    frequency: {
      type: "string",
      enum: ["oncePerFileAndSession"]
    }
  },
  required: ["condition", "frequency", "event"]
}
export interface FlowConfiguration {
  flow: string,
  command: Command,
  inputConfigurations: Array<InputConfiguration>,
  resultActions: Array<Action>,
  triggers?: Array<Trigger>
}

const flowConfigurationSchema: JSONSchemaType<FlowConfiguration> = {
  type: "object",
  properties: {
    inputConfigurations: {
      type: "array",
      items: inputConfigurationSchema
    },
    command: commandSchema,
    flow: {
      type: "string"
    },
    resultActions: {
      type: "array",
      items: actionSchema
    },
    triggers: {
      type: "array",
      items: triggerSchema,
      nullable: true
    }
  },
  required: ["inputConfigurations", "command", "flow", "resultActions"]
}

export interface Settings {
  apiKey?: string,
  baseUrl: string,
  version: string,
  flowDefinitions: Array<FlowDefinition>,
  flowConfigurations: Array<FlowConfiguration>
}

const settingsSchema: JSONSchemaType<Settings> = {
  type: "object",
  properties: {
    apiKey: {
      type: "string",
      nullable: true
    },
    baseUrl: {
      type: "string"
    },
    version: {
      type: "string"
    },
    flowDefinitions: {
      type: "array",
      items: flowDefinitionSchema
    },
    flowConfigurations: {
      type: "array",
      items: flowConfigurationSchema
    }
  },
  required: [
    "baseUrl", "version", "flowDefinitions", "flowConfigurations"
  ]
}

export type APIResponse = {
  constants? : Record<string, string>
  records?: Array<Record<string, string>>
  errors?: Array<string>
}

const apiResponseSchema: JSONSchemaType<APIResponse> = {
  type: "object",
  properties: {
    constants: {
      type: "object",
      nullable: true,
      required: []
    },
    records: {
      type: "array",
      items: {
        type: "object",
        required: []
      },
      nullable: true
    },
    errors: {
      type: "array",
      items: {
        type: "string"
      },
      nullable: true
    }
  }
}

export const validateSettings = ajv.compile(settingsSchema)
export const validateFlowDefinition = ajv.compile(flowDefinitionSchema)
export const validateApiResponse = ajv.compile(apiResponseSchema)
export const validateFlowConfiguration = ajv.compile(flowConfigurationSchema)
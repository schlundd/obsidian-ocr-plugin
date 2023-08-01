import { Action, ActionType } from "./validation"


export const getDefaultForAction = (action: ActionType): Action => {
  if (action === "createOrAppendFile" || action === "createOrReplaceFile") {
    return {
      action,
      filePath: "",
      sourceType: "raw"
    }
  }
  if (action === "insertAtCursorPosition") {
    return {
      action,
      sourceType: "raw"
    }
  }
  if (action === "replaceActiveFile") {
    return {
      action,
      sourceType: "raw"
    }
  }
  if (action === "popup") {
    return {
      action,
      sourceType: "raw"
    }
  }
  if (action === "log") {
    return {
      action,
      sourceType: "raw"
    }
  }

  // not supposed to happen
  return {
    action: "log",
    sourceType: "raw"
  }
}
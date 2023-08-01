import { Plugin } from "obsidian";
import { applySettings, connectToAccount, getSettings, saveSettings } from "./lib/settings";
import { TaskboneSettingsTab } from "./ui/taskboneSettingsTab";

export class TaskbonePlugin extends Plugin {
  async onload() {
    this.addSettingTab(new TaskboneSettingsTab(this))
    let settings = await getSettings(this)

    if (!settings.apiKey) {
      const key = await connectToAccount(this)
    } else {
      applySettings(settings, this)
    }
  }
}
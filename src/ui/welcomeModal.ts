import { App, Modal, request } from "obsidian";
import { wait } from "src/lib/tools";

export class WelcomeModal extends Modal {

  pageUrl: string
  apiUrl: string
  title: string
  cb: (key: string) => any

  constructor(app: App, apiUrl: string, pageUrl: string, cb: (key: string) => any) {
    super(app)
    this.title = "Welcome to Taskbone"

    console.log(pageUrl)

    this.pageUrl = pageUrl
    this.apiUrl = apiUrl
    
    this.cb = cb
  }

	async onOpen() {
    
    this.titleEl.setText(this.title)

    const resp = await request({
      url: this.pageUrl
    })
    if (resp) {
      this.contentEl.innerHTML = resp  
    }
    let secretKey = ""
    let count = 0
    const limit = 30
    do {
      count++;
      console.log(`Trying to connect to Taskbone (attempt ${count} of ${limit})`)
      secretKey = await request({
        url: this.apiUrl,
        method: "post"
      })
      await wait(2000)
    } while (secretKey === "" && count < limit);
    this.close()
    this.cb(secretKey)
	}
}
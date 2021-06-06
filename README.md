# Obsidian OCR Plugin

With this plugin you can extract the text of image attachments. It will create an annotation document next to the image document. This will contain a link to the image and the extracted text.

If you search for text that is part of the image, it will yield the annotation document.

## Demo
![](demo.gif)

## Remarks
**Note**: This plugin is not in the official list of plugins, yet. You need to [install it manually](#Manually-installing-the-plugin).

**Note**: The process of extracting the text from the image is not done locally, but via an online API. The service stores the image on its servers only as long as necessary for the text extraction. However, if this is a dealbreaker for you, see [Alternatives](#Alternatives).

## Manually installing the plugin

- Clone this repo
- npm i or yarn to install dependencies
- npm run build
- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/taskbone-ocr-plugin/`.

## Alternatives
### Local Tesseract installation
See https://forum.obsidian.md/t/basic-ocr-in-obsidian/18087

Advantages:
* runs locally on your machine

Disadvantages:
* runs locally on your machine
* probably slower
* probably worse results

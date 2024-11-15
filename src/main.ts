import {
	App,
	Menu,
	MenuItem,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
} from "obsidian";
import * as path from "path";

import { MarkdownExportPluginSettings, DEFAULT_SETTINGS } from "./config";
import { tryCreateFolder, tryRun } from "./utils";

export default class MarkdownExportPlugin extends Plugin {
	settings: MarkdownExportPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MarkdownExportSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				// dir/file menu
				this.registerDirMenu(menu, file);
				// file menu
				// if ((<TFile>file).extension) {
				// 	const addFileMenuItem = (item: MenuItem) => {
				// 		item.setTitle("Export to HTML");
				// 		item.onClick(async () => {
				// 			new Notice(
				// 				`Export to HTML`
				// 			);
				// 		});
				// 	}
				// 	menu.addItem(addFileMenuItem);
				// }
			}),
		);

		for (const outputFormat of ["markdown", "HTML"]) {
			this.addCommand({
				id: "export-to-" + outputFormat,
				name: `Export to ${outputFormat}`,
				callback: async () => {
					const file = this.app.workspace.getActiveFile();
					if (!file) {
						new Notice(`No active file`);
						return;
					}
					this.createFolderAndRun(file, outputFormat);
				},
			});
		}
	}

	registerDirMenu(menu: Menu, file: TAbstractFile) {
		for (const outputFormat of ["markdown", "HTML"]) {
			const addMenuItem = (item: MenuItem) => {
				item.setTitle(`Export to ${outputFormat}`);
				item.onClick(async () => {
					await this.createFolderAndRun(file, outputFormat);
				});
			};
			menu.addItem(addMenuItem);
		}
	}
	private async createFolderAndRun(
		file: TAbstractFile,
		outputFormat: string,
	) {

		let dir = ""
		if (this.settings.includeFileName == true) {
			dir = file.name.replace(".md", "")
		}

		// try create attachment directory
		await tryCreateFolder(
			this,
			path.join(this.settings.output, dir, this.settings.attachment),
		);

		// run
		await tryRun(this, file, outputFormat);

		new Notice(
			`Exporting ${file.path} to ${path.join(
				this.settings.output,
				dir,
				file.name,
			)}`,
		);
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class MarkdownExportSettingTab extends PluginSettingTab {
	plugin: MarkdownExportPlugin;

	constructor(app: App, plugin: MarkdownExportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Markdown Export" });

		new Setting(containerEl)
			.setName("默认导出路径")
			.setDesc("一键导出的默认目录")
			.addText((text) =>
				text
					.setPlaceholder("输入导出路径")
					.setValue(this.plugin.settings.output)
					.onChange(async (value) => {
						this.plugin.settings.output = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("自定义附件路径（可选）")
			.setDesc("附件路径，相对于输出路径")
			.addText((text) =>
				text
					.setPlaceholder("输入附件路径")
					.setValue(this.plugin.settings.attachment)
					.onChange(async (value) => {
						this.plugin.settings.attachment = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("使用GitHub风格Markdown")
			.setDesc(
				"markdown的格式更倾向于选择Github风味Markdown",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.GFM)
					.onChange(async (value: boolean) => {
						this.plugin.settings.GFM = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("使用Html标签<img/>显示图像")
			.setDesc(
				"默认关闭，<img/>标签将使用黑曜石中指定的大小。",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.displayImageAsHtml)
					.onChange(async (value: boolean) => {
						this.plugin.settings.displayImageAsHtml = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("文件名编码")
			.setDesc(
				"如果要保留原始文件名，请将其设置为false",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.fileNameEncode)
					.onChange(async (value: boolean) => {
						this.plugin.settings.fileNameEncode = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("去除外链")
			.setDesc(
				"如果要删除外链中的括号，请将其打开",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.removeOutgoingLinkBrackets)
					.onChange(async (value: boolean) => {
						this.plugin.settings.removeOutgoingLinkBrackets = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("输出文件名")
			.setDesc(
				"如果要在输出路径中包含文件名（不带扩展名），请将其设置为true",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeFileName)
					.onChange(async (value: boolean) => {
						this.plugin.settings.includeFileName = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("自定义导出文件名")
			.setDesc("不需要输入扩展名")
			.addText((text) =>
				text
					.setPlaceholder("输入导出文件名")
					.setValue(this.plugin.settings.customFileName)
					.onChange(async (value) => {
						this.plugin.settings.customFileName = value;
						await this.plugin.saveSettings();
					}),
			);
		containerEl.createEl("h3", { text: "obsidian to anki相关配置" });
		new Setting(containerEl)
			.setName("删除anki卡片id")
			.setDesc(
				"删除 <!--ID: 13个数字-->",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.removeAnkiCardId)
					.onChange(async (value: boolean) => {
						this.plugin.settings.removeAnkiCardId = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("去除挖空 2：{c1::内容}⇒内容")
			.setDesc(
				"将卡片内容{c数字::内容}替换为内容",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.cleanHollowFormat)
					.onChange(async (value: boolean) => {
						this.plugin.settings.cleanHollowFormat = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName("去除挖空 1：{内容}⇒内容")
			.setDesc(
				"将卡片内容{内容}替换为内容",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.cleanBraces)
					.onChange(async (value: boolean) => {
						this.plugin.settings.cleanBraces = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}

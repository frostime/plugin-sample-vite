思源支持的 i18n 文件范围，可以在控制台 `siyuan.config.langs` 中查看。当前语言标签使用 BCP 47 形式，例如：

The range of i18n files supported by SiYuan can be viewed in the console under `siyuan.config.langs`. Language tags use BCP 47 forms, for example:

```js
>>> siyuan.config.langs.map(lang => lang.name)
['de', 'en', 'es', 'fr', 'he', 'it', 'ja', 'pl', 'ru', 'zh-TW', 'zh-CN']
```

在插件开发中，默认使用 JSON 格式作为国际化（i18n）的载体文件。如果您更喜欢使用 YAML 语法，可以将 JSON 文件替换为 YAML 文件（例如 `en.yaml`），并在其中编写 i18n 文本。本模板提供了相关的 Vite 插件，可以在编译时自动将 YAML 文件转换为 JSON 文件。构建时会从 `dist` 目录删除 YAML 文件和本说明文件，仅保留插件运行所需的 JSON 文件。

In plugin development, JSON is used by default for internationalization (i18n). If you prefer YAML, replace a JSON file with a YAML file (for example, `en.yaml`) and write the i18n text there. This template converts YAML files to JSON during the Vite build. YAML files and this document are removed from `dist` after the build, leaving only the JSON files required by the plugin.

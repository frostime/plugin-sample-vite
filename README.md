
# SiYuan plugin sample with vite

[中文版](./README.zh-CN.md)

> Based on [siyuan/plugin-sample](https://github.com/siyuan-note/plugin-sample) [v0.5.0](https://github.com/siyuan-note/plugin-sample/tree/v0.5.0), with selected updates from newer releases.


1. Using vite for packaging
2. Use symbolic linking instead of putting the project into the plugins directory program development
3. Provides a github action template to automatically generate package.zip and upload to new release

## Get started

1. Use the <kbd>Use this template</kbd> button to make a copy of this repo as a template. Note that the repository name should match the plugin name, and the default branch must be `main`.
2. Clone your repository to the local development folder.
    * Note: Unlike `plugin-sample`, this example does not recommend directly downloading the code to `{workspace}/data/plugins/`.
3. Install Node.js 24 or later and pnpm 11.4, then run `pnpm i` in the development folder to install the required dependencies.
4. Run the `pnpm run make-link` command to create a symbolic link (Windows developers, please refer to the "make-link on Windows" section below).
5. Execute `pnpm run dev` for real-time compilation. In development mode, the generated app bundle connects to the local LiveReload server and asks the current SiYuan window to reload this plugin only.

   The default LiveReload port is derived from the plugin name, so separate projects normally get different ports. Set `SIYUAN_LIVERELOAD_PORT` when you need a fixed port. The default debounce is 300 ms and the default delay between disabling and re-enabling the plugin is 500 ms. You can customize them before starting development:

   ```powershell
   $env:SIYUAN_LIVERELOAD_PORT = "35740"
   $env:SIYUAN_LIVERELOAD_DEBOUNCE_MS = "300"
   $env:SIYUAN_PLUGIN_RELOAD_GAP_MS = "500"
   $env:SIYUAN_LIVERELOAD_MESSAGE = "Current check item already exists"
   pnpm run dev
   ```

   If the port is already in use — for example, another plugin project copied from this template is also running `pnpm run dev` — the build continues without live reload. The embedded client also verifies the server identity before reacting to reload events, preventing one plugin from responding to another plugin's LiveReload server. Set `SIYUAN_LIVERELOAD_PORT` to a free port if you need live reload.
6. Open the marketplace in SiYuan and enable the plugin in the download tab.


### Setting the Target Directory for the make-link Command

The `make-link` command creates a symbolic link that binds your `dev` directory to the SiYuan plugin directory. You can configure the target SiYuan workspace and create the symbolic link in three ways:

1. **Select Workspace**
    - Open SiYuan, ensure the SiYuan kernel is running.
    - Run `pnpm run make-link`, the script will automatically detect all SiYuan workspaces, please manually enter the number to select the workspace.
        ```bash
        >>> pnpm run make-link
        > plugin-sample-vite@0.0.3 make-link H:\SrcCode\开源项目\plugin-sample-vite
        > node  --no-warnings ./scripts/make_dev_link.js

        "targetDir" is empty, try to get SiYuan directory automatically....
        Got 2 SiYuan workspaces
        [0] H:\Media\SiYuan
        [1] H:\临时文件夹\SiYuanDevSpace
        Please select a workspace[0-1]: 0
        Got target directory: H:\Media\SiYuan/data/plugins
        Done! Created symlink H:\Media\SiYuan/data/plugins/plugin-sample-vite
        ```
2. **Manually Configure Target Directory**
    - Open the `./scripts/make_dev_link.js` file, change `targetDir` to the SiYuan plugin directory `<siyuan workspace>/data/plugins`.
    - Run the `pnpm run make-link` command. If you see a message similar to the one below, it indicates successful creation:

3. **Set Environment Variable to Create Symbolic Link**
    - Set the system environment variable `SIYUAN_PLUGIN_DIR` to the path `workspace/data/plugins`.

### make-link on Windows

Due to SiYuan upgrading to Go 1.23, the old version of junction links cannot be recognized normally on Windows, so it has been changed to create `dir` symbolic links.

> https://github.com/siyuan-note/siyuan/issues/12399

However, creating directory symbolic links on Windows using NodeJs may require administrator privileges. You have the following options:

1. Run `pnpm run make-link` in a command line with administrator privileges.
2. Configure Windows settings, enable developer mode in [System Settings - Update & Security - Developer Mode] then run `pnpm run make-link`.
3. Run `pnpm run make-link-win`, this command will use a PowerShell script to request administrator privileges, requiring the system to enable PowerShell script execution permissions.

## I18n

In terms of internationalization, our main consideration is to support multiple languages. Specifically, we need to
complete the following tasks:

* Meta information about the plugin itself, such as plugin display name, description and readme
    * `displayName`, `description` and `readme` fields in plugin.json, and the corresponding README*.md file
* Text used in the plugin, such as button text and tooltips
    * public/i18n/*.json language configuration files
    * Use `this.i18n.key` to get the text in the code
* YAML Support
  * This template specifically supports I18n based on YAML syntax, see `public/i18n/zh-CN.yaml`
  * During compilation, the defined YAML files will be automatically translated into JSON files and placed in the dist or dev directory.

It is recommended that the plugin supports at least English and Simplified Chinese, so that more people can use it more
conveniently. Unsupported languages do not need to be declared in the `displayName`, `description` and `readme` fields in plugin.json.

## plugin.json

```json
{
  "name": "plugin-sample-vite",
  "author": "frostime",
  "url": "https://github.com/frostime/plugin-sample-vite",
  "version": "0.5.0",
  "minAppVersion": "3.8.0",
  "disabledInPublish": true,
  "backends": ["windows", "linux", "darwin"],
  "frontends": ["desktop"],
  "displayName": {
    "default": "Plugin sample with vite",
    "zh-CN": "插件样例 vite 版"
  },
  "description": {
    "default": "SiYuan plugin sample with vite",
    "zh-CN": "使用 vite 开发的思源插件样例"
  },
  "readme": {
    "default": "README.md",
    "zh-CN": "README.zh-CN.md"
  },
  "icon": "icon.png",
  "preview": "preview.png",
  "funding": {
    "openCollective": "",
    "patreon": "",
    "github": "",
    "custom": [
      "https://ld246.com/sponsor"
    ]
  },
  "keywords": [
    "plugin", "sample", "插件样例"
  ]
}
```

* `name`: Plugin name, must be the same as the repo name, and must be unique globally (no duplicate plugin names in the
  marketplace)
* `author`: Plugin author name
* `url`: Plugin repo URL
* `version`: Plugin version number, it is recommended to follow the [semver](https://semver.org/) specification
* `minAppVersion`: Minimum version number of SiYuan required to use this plugin
* `disabledInPublish`: Set to `true` when this template should not be published to the marketplace
* `backends`: Backend environment required by the plugin, optional values are `windows`, `linux`, `darwin`, `docker`, `android`, `ios`, `harmony` and `all`
  * `windows`: Windows desktop
  * `linux`: Linux desktop
  * `darwin`: macOS desktop
  * `docker`: Docker
  * `android`: Android APP
  * `ios`: iOS APP
  * `harmony`: HarmonyOS APP
  * `all`: All environments
* `frontends`: Frontend environment required by the plugin, optional values are `desktop`, `desktop-window`, `mobile`, `browser-desktop`, `browser-mobile` and `all`
  * `desktop`: Desktop
  * `desktop-window`: Desktop window converted from tab
  * `mobile`: Mobile APP
  * `browser-desktop`: Desktop browser
  * `browser-mobile`: Mobile browser
  * `all`: All environments
* When `all` appears in `backends` or `frontends`, it must not be mixed with concrete platform values: write `["all"]` alone, or an explicit platform list. The marketplace automated check rejects mixed lists (the official sample template repos are exempted for demonstration purposes).
* `displayName`: Plugin name (plain text), displayed in the marketplace list, supports multiple languages
    * `default`: Default language, must exist
    * `zh-CN`, `en` and other languages: optional, must be [BCP 47](https://tools.ietf.org/html/bcp47) tags (e.g. `zh-CN`, `zh-TW`, `en`, `ja`, `pt-BR`)
* `description`: Plugin description (plain text), displayed in the marketplace list, supports multiple languages
    * `default`: Default language, must exist
    * `zh-CN`, `en` and other languages: optional, must be BCP 47 tags
* `readme`: readme file name, mainly used to display in the marketplace details page, supports multiple languages
    * `default`: Default language, must exist
    * `zh-CN`, `en` and other languages: optional, must be BCP 47 tags
    * Relative images are loaded from `package.zip` when present; otherwise the online marketplace falls back to the matching GitHub Release. Include them in `package.zip` for offline use
* `icon`: Optional marketplace icon filename at the package root. Supports PNG, JPEG, WebP, and AVIF up to 64 KiB; the recommended size is 160*160
* `preview`: Optional marketplace preview filename at the package root. Supports PNG, JPEG, WebP, and AVIF up to 512 KiB; the recommended size is 1024*768
    * SVG is unsupported. To omit an image, remove its field and the legacy `icon.png` or `preview.png`; an empty field value is invalid
* `funding`: Plugin sponsorship information
    * `openCollective`: Open Collective name
    * `patreon`: Patreon name
    * `github`: GitHub login name
    * `custom`: Custom sponsorship link list
    * `links`: Labeled custom sponsorship links, for example `{"label": "Sponsor", "url": "https://example.com"}`
* `keywords`: Search keyword list, used for marketplace search function

## Package

No matter which method is used to compile and package, we finally need to generate a package.zip, which contains at
least the following files:

* i18n/*
* Image files declared by `icon` and `preview` (optional)
* index.css
* index.js
* plugin.json
* README*.md
* asset/* (README images required offline)

## List on the marketplace

* `pnpm run build` to generate package.zip
* Create a new GitHub release using your new version number as the "Tag version". See here for an
  example: https://github.com/siyuan-note/plugin-sample/releases
* Upload the file package.zip as binary attachments
* Publish the release

For the first release, fork the [Community Bazaar](https://github.com/siyuan-note/bazaar), add one `owner/repo` line to `plugins.txt` in its root, and open a PR against `main`. Use one repository per line without commas or empty lines, and add only one new package per PR. See [Submitting a bazaar package](https://github.com/siyuan-note/bazaar#submitting-a-bazaar-package) for the full process and review rules.

After the PR is merged, the bazaar updates its index automatically. For subsequent updates, increase `version` in the package manifest and publish a regular GitHub Release containing `package.zip`; no additional listing PR is needed. See [Updating a bazaar package](https://github.com/siyuan-note/bazaar#updating-a-bazaar-package) for update timing and troubleshooting, and check deployment status in the [Stage workflow](https://github.com/siyuan-note/bazaar/actions/workflows/stage.yml).

## Use Github Action

The included workflow checks, packages, and publishes a GitHub release automatically:

1. In `Settings` > `Actions` > `General`, select **Read and write permissions** under **Workflow permissions**.

    ![](asset/action.png)

2. Update the versions in `package.json` and `plugin.json`, then push a matching tag:

    ```bash
    git tag v0.5.0
    git push origin v0.5.0
    ```

    The workflow verifies that the tag version matches both JSON files before checking, building, or publishing.

3. The workflow creates a regular release by default. Set `prerelease: true` in `.github/workflows/release.yml` when needed.

## SiYuan API helper

Most functions in `src/api.ts` return an `ApiResponse` object instead of returning the kernel data directly:

```ts
const response = await sql("select * from blocks");
if (response.ok) {
  console.log(response.data);
}
```

Use `response.ok` before reading `response.data`; `response.raw` contains the original kernel response.

## Developer's Guide

Developers of SiYuan need to pay attention to the following specifications.

### 1. File Reading and Writing Specifications

If plugins or external extensions require direct reading or writing of files under the `data` directory, please use the kernel API to achieve this. **Do not call `fs` or other electron or nodejs APIs directly**, as it may result in data loss during synchronization and cause damage to cloud data.

Related APIs can be found at: `/api/file/*` (e.g., `/api/file/getFile`).

### 2. Daily Note Attribute Specifications

When creating a daily note in SiYuan, a custom-dailynote-yyyymmdd attribute will be automatically added to the document to distinguish it from regular documents.

> For more details, please refer to [Github Issue #9807](https://github.com/siyuan-note/siyuan/issues/9807).

Developers should pay attention to the following when developing the functionality to manually create Daily Notes:

* If `/api/filetree/createDailyNote` is called to create a daily note, the attribute will be automatically added to the document, and developers do not need to handle it separately
* If a document is created manually by developer's code (e.g., using the `createDocWithMd` API to create a daily note), please manually add this attribute to the document


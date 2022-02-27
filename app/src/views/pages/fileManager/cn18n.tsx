import { ChonkyActions, FileData, FileHelper, I18nConfig } from 'chonky'
import { IntlShape } from 'chonky/node_modules/react-intl'

const cn18n: I18nConfig = {
  locale: 'zh-cn',
  formatters: {
    formatFileModDate: (intl: IntlShape, file: FileData | null) => {
      const safeModDate = FileHelper.getModDate(file)
      if (safeModDate) {
        return `${intl.formatDate(safeModDate)}, ${intl.formatTime(safeModDate)}`
      } else {
        return null
      }
    },
    formatFileSize: (intl: IntlShape, file: FileData | null) => {
      if (!file || typeof file.size !== 'number') return null
      return `大小: ${file.size}`
    },
  },
  messages: {
    // Chonky UI translation strings. String IDs hardcoded into Chonky's source code.
    'chonky.toolbar.searchPlaceholder': '搜索',
    'chonky.toolbar.visibleFileCount': `{fileCount, plural,
            =0 {# items}
            one {# item}
            other {# items}
        }`,
    'chonky.toolbar.selectedFileCount': `{fileCount, plural,
            =0 {}
            other {# selected}
        }`,
    'chonky.toolbar.hiddenFileCount': `{fileCount, plural,
            =0 {}
            other {# selected}
        }`,
    'chonky.fileList.nothingToShow': '无内容!',
    'chonky.contextMenu.browserMenuShortcut': '查看菜单: {shortcut}',

    // File action translation strings. These depend on which actions you have
    // enabled in Chonky.
    [`chonky.actionGroups.Actions`]: '操作',
    [`chonky.actionGroups.Options`]: '选项',
    [`chonky.actions.${ChonkyActions.OpenParentFolder.id}.button.name`]: '父目录',
    [`chonky.actions.${ChonkyActions.CreateFolder.id}.button.name`]: '创建目录',
    [`chonky.actions.${ChonkyActions.UploadFiles.id}.button.name`]: '上传文件',
    [`chonky.actions.${ChonkyActions.UploadFiles.id}.button.tooltip`]: '上传文件',
    [`chonky.actions.${ChonkyActions.CreateFolder.id}.button.tooltip`]: '创建目录',
    [`chonky.actions.${ChonkyActions.DeleteFiles.id}.button.name`]: '删除文件',
    [`chonky.actions.${ChonkyActions.OpenSelection.id}.button.name`]: '选择',
    [`chonky.actions.${ChonkyActions.SelectAllFiles.id}.button.name`]: '全部选择',
    [`chonky.actions.${ChonkyActions.ClearSelection.id}.button.name`]: '清除选择',
    [`chonky.actions.${ChonkyActions.EnableListView.id}.button.name`]: '列表视图',
    [`chonky.actions.${ChonkyActions.EnableGridView.id}.button.name`]: '表格视图',
    [`chonky.actions.${ChonkyActions.SortFilesByName.id}.button.name`]: '按名字排序',
    [`chonky.actions.${ChonkyActions.SortFilesBySize.id}.button.name`]: '按文件尺寸排序',
    [`chonky.actions.${ChonkyActions.SortFilesByDate.id}.button.name`]: '按日期排序',
    [`chonky.actions.${ChonkyActions.ToggleHiddenFiles.id}.button.name`]: '不显示隐藏文件',
    [`chonky.actions.${ChonkyActions.ToggleShowFoldersFirst.id}.button.name`]: '显示隐藏文件',
  },
}

export default cn18n

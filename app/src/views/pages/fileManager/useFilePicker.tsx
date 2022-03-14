import React, { Dispatch, SetStateAction } from 'react'
import { ChonkyActions, FileData } from 'chonky'
import { FileActionHandler, FileArray } from 'chonky'

export type SelectedFilesProps = {
  selectedFiles: FileArray
  setSelectedFiles: Dispatch<SetStateAction<FileArray<FileData>>>
}

export const useFilePicker = (selectedFilesProps: SelectedFilesProps) => {
  //hook state 不能共享， 为了实现用户点击文件列表增加项目， 在弹出页面能够删除项需要将selectedFiles放到父类
  //const [selectedFiles, setSelectedFiles] = useState<FileArray>([])
  const { selectedFiles, setSelectedFiles } = selectedFilesProps
  //action事件处理函数
  const handleAction = React.useCallback<FileActionHandler>((data) => {
    console.log('actionHandle data', selectedFiles)
    if (data.id === ChonkyActions.OpenFiles.id && !data.payload.targetFile.isDir) {
      const existed = selectedFiles.find((x) => x.id === data.payload.targetFile.id)
      if (!existed) {
        selectedFiles.push(data.payload.targetFile)
        setSelectedFiles([...selectedFiles])
      }
    }
  }, [])

  return {
    handleAction,
  }
}

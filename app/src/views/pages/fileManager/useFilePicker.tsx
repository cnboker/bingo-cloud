import React, { useState } from 'react'
import { ChonkyActions, FileData } from 'chonky'
import { FileActionHandler, FileArray } from 'chonky'

export const useFilePicker = (initialSelectedFiles: FileArray) => {
  const [selectedFiles, setSelectedFiles] = useState<FileArray>(initialSelectedFiles)
  //action事件处理函数
  const handleAction = React.useCallback<FileActionHandler>(
    (data) => {
      setSelectedFiles((values) => {
        if (data.id === ChonkyActions.OpenFiles.id && !data.payload.targetFile.isDir) {
          const existed = values.find((x) => x.id === data.payload.targetFile.id)
          if (!existed) {
            return [...values, data.payload.targetFile]
          }
        }
        return values
      })
    },
    [selectedFiles],
  )

  const removeAction = (index: number) => {
    if (index !== -1) {
      selectedFiles.splice(index, 1)
      setSelectedFiles([...selectedFiles])
    }
  }

  const onMovedown = (item: FileData, index: number) => {
    if (index < selectedFiles.length - 1) {
      const preNode = selectedFiles[index + 1]
      selectedFiles[index + 1] = item
      selectedFiles[index] = preNode
      setSelectedFiles([...selectedFiles])
    }
  }

  const onMoveup = (item: FileData, index: number) => {
    if (index > 0) {
      const preNode = selectedFiles[index - 1]
      selectedFiles[index - 1] = item
      selectedFiles[index] = preNode
      setSelectedFiles([...selectedFiles])
    }
  }

  return { selectedFiles, fileSelectAction: handleAction, removeAction, onMovedown, onMoveup }
}

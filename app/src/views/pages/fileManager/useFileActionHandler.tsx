import { ChonkyActions, ChonkyFileActionData, FileData, FileHelper } from 'chonky'
import { CustomFileData } from 'chonky/dist/extensions/file-map'
import { useCallback } from 'react'
import { asyncDelete } from 'src/lib/api'
import { FileDeleteUrl } from './constants'

export const useFileActionHandler = (
  setCurrentFolderId: (folderId: string) => void,
  deleteFiles: (files: CustomFileData[]) => void,
  moveFiles: (files: FileData[], source: FileData, destination: FileData) => void,
  createFolder: (folderName: string) => void,
  uploadFiles: () => void,
) => {
  return useCallback(
    (data: ChonkyFileActionData) => {
      if (data.id === ChonkyActions.OpenFiles.id) {
        const { targetFile, files } = data.payload
        const fileToOpen = targetFile ?? files[0]
        if (fileToOpen && FileHelper.isDirectory(fileToOpen)) {
          setCurrentFolderId(fileToOpen.id)
          return
        }
      } else if (data.id === ChonkyActions.DeleteFiles.id) {
        const files = data.state.selectedFilesForAction
        asyncDelete({
          url: FileDeleteUrl,
          data: files.map((x) => x.path),
        }).then(() => {
          deleteFiles(files)
        })
      } else if (data.id === ChonkyActions.MoveFiles.id) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        moveFiles(data.payload.files, data.payload.source!, data.payload.destination)
      } else if (data.id === ChonkyActions.CreateFolder.id) {
        console.log('create dir', data)
        const folderName = prompt('Provide the name for your new folder:')
        if (folderName) createFolder(folderName)
      } else if (data.id === ChonkyActions.UploadFiles.id) {
        console.log('upload file trigger!')
        uploadFiles()
      }
      //showActionNotification(data)
    },
    [createFolder, deleteFiles, moveFiles, setCurrentFolderId, uploadFiles],
  )
}

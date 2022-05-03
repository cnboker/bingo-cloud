import { ChonkyActions, ChonkyFileActionData, FileData, FileHelper } from 'chonky'
import { CustomFileData } from 'chonky/dist/extensions/file-map'
import { useCallback } from 'react'
import { asyncDelete } from 'src/lib/api'
import { FileDeleteUrl } from './constants'
import * as Dialog from 'src/views/components/dialog/Index'
export const useFileActionHandler = (
  setCurrentFolderId: (folderId: string) => void,
  deleteFiles: (files: CustomFileData[]) => void,
  moveFiles: (files: FileData[], source: FileData, destination: FileData) => void,
  createFolder: (folderName: string) => void,
  uploadFiles: () => void,
  getPath: (id: string) => string,
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
        console.log('delete files', files)
        asyncDelete({
          url: FileDeleteUrl,
          data: files.map((x) => {
            console.log('delete', getPath(x.id))
            return {
              isDir: x.isDir,
              path: getPath(x.id) + '/' + (x.isDir ? '' : x.name),
            }
          }),
        }).then(() => {
          deleteFiles(files)
        })
      } else if (data.id === ChonkyActions.MoveFiles.id) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        moveFiles(data.payload.files, data.payload.source!, data.payload.destination)
      } else if (data.id === ChonkyActions.CreateFolder.id) {
        //console.log('create dir', data)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        Dialog.prompt('Provide the name for your new folder', ({ val }) => {
          if (val) createFolder(val)
        })
      } else if (data.id === ChonkyActions.UploadFiles.id) {
        console.log('upload file trigger!')
        uploadFiles()
      }
      //showActionNotification(data)
    },
    [createFolder, deleteFiles, moveFiles, setCurrentFolderId, uploadFiles],
  )
}

/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import {
  ChonkyActions,
  ChonkyFileActionData,
  FileArray,
  FileBrowserProps,
  FileData,
  FileHelper,
  FullFileBrowser,
} from 'chonky'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

//import { showActionNotification } from './util'
import { setChonkyDefaults } from 'chonky'
import { ChonkyIconFA } from 'chonky-icon-fontawesome'
import { asyncGet, asyncDelete, asyncPost } from 'src/lib/api'
import { useAsyncCallback } from 'src/lib/asynchronous'
import { FileListUrl, FileDeleteUrl, DirCreateUrl } from './constants'
import FilePicker from 'src/views/components/widgets/FilePicker'
import * as Dialog from 'src/views/components/dialog/Index'
import { uniqueID } from 'src/lib/string'
import './patch.css'

setChonkyDefaults({ iconComponent: ChonkyIconFA })

interface FsMap {
  fileMap: CustomFileData
  rootFolderId: string
}
// We define a custom interface for file data because we want to add some custom fields
// to Chonky's built-in `FileData` interface.
interface CustomFileData extends FileData {
  parentId?: string
  childrenIds?: string[]
}
interface CustomFileMap {
  [fileId: string]: CustomFileData
}

// Helper method to attach our custom TypeScript types to the imported JSON file map.
const useFetchCustomFileMap = () => {
  return useAsyncCallback(async () => {
    const result = await asyncGet({
      url: FileListUrl,
    })
    const map = result.data as FsMap
    //const baseFileMap = DemoFsMap.fileMap as unknown as CustomFileMap
    return map
  }, [])
}

// Hook that sets up our file map and defines functions used to mutate - `deleteFiles`,
// `moveFiles`, and so on.
const useCustomFileMap = (data: FsMap) => {
  const { fileMap: baseFileMap, rootFolderId } = data as FsMap
  // Setup the React state for our file map and the current folder.
  const [fileMap, setFileMap] = useState(baseFileMap)
  const [currentFolderId, setCurrentFolderId] = useState(rootFolderId)
  // Setup the function used to reset our file map to its initial value. Note that
  // here and below we will always use `useCallback` hook for our functions - this is
  // a crucial React performance optimization, read more about it here:
  // https://reactjs.org/docs/hooks-reference.html#usecallback
  const resetFileMap = useCallback(() => {
    setFileMap(baseFileMap)
    setCurrentFolderId(rootFolderId)
  }, [baseFileMap, rootFolderId])

  // Setup logic to listen to changes in current folder ID without having to update
  // `useCallback` hooks. Read more about it here:
  // https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables
  const currentFolderIdRef = useRef(currentFolderId)
  useEffect(() => {
    currentFolderIdRef.current = currentFolderId
  }, [currentFolderId])

  // Function that will be called when user deletes files either using the toolbar
  // button or `Delete` key.
  const deleteFiles = useCallback((files: CustomFileData[]) => {
    // We use the so-called "functional update" to set the new file map. This
    // lets us access the current file map value without having to track it
    // explicitly. Read more about it here:
    // https://reactjs.org/docs/hooks-reference.html#functional-updates
    setFileMap((currentFileMap) => {
      // Create a copy of the file map to make sure we don't mutate it.
      const newFileMap = { ...currentFileMap }
      files.forEach((file) => {
        // Delete file from the file map.
        delete newFileMap[file.id]

        // Update the parent folder to make sure it doesn't try to load the
        // file we just deleted.
        if (file.parentId) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const parent = newFileMap[file.parentId]!
          const newChildrenIds = parent.childrenIds!.filter((id: string) => id !== file.id)
          newFileMap[file.parentId] = {
            ...parent,
            childrenIds: newChildrenIds,
            childrenCount: newChildrenIds.length,
          }
        }
      })

      return newFileMap
    })
  }, [])

  // Function that will be called when files are moved from one folder to another
  // using drag & drop.
  const moveFiles = useCallback(
    (files: CustomFileData[], source: CustomFileData, destination: CustomFileData) => {
      setFileMap((currentFileMap) => {
        const newFileMap = { ...currentFileMap }
        const moveFileIds = new Set(files.map((f) => f.id))

        // Delete files from their source folder.
        const newSourceChildrenIds = source.childrenIds!.filter((id) => !moveFileIds.has(id))
        newFileMap[source.id] = {
          ...source,
          childrenIds: newSourceChildrenIds,
          childrenCount: newSourceChildrenIds.length,
        }

        // Add the files to their destination folder.
        const newDestinationChildrenIds = [...destination.childrenIds!, ...files.map((f) => f.id)]
        newFileMap[destination.id] = {
          ...destination,
          childrenIds: newDestinationChildrenIds,
          childrenCount: newDestinationChildrenIds.length,
        }

        // Finally, update the parent folder ID on the files from source folder
        // ID to the destination folder ID.
        files.forEach((file) => {
          newFileMap[file.id] = {
            ...file,
            parentId: destination.id,
          }
        })

        return newFileMap
      })
    },
    [],
  )

  const uploadFiles = useCallback(() => {
    //必须在setFileMap函数里面，才能获取到新建文件夹关联数据
    setFileMap((map) => {
      const { path } = map[currentFolderIdRef.current]
      Dialog.confirm(
        <FilePicker
          basePath={path}
          onProcessFiles={(files) => {
            console.log('response data', files)
            appendFileNode(files)
          }}
        />,
      )
      return map
    })
  }, [])

  const appendFileNode = (fileInfo: any) => {
    const { fileName, path } = fileInfo
    setFileMap((fileMap) => {
      const newFileId = uniqueID()
      const newFileMap = { ...fileMap }
      const currentFolder = newFileMap[currentFolderIdRef.current]
      newFileMap[newFileId] = {
        id: newFileId,
        name: fileName,
        isDir: false,
        path,
        modDate: new Date(),
        parentId: currentFolderIdRef.current,
      }
      newFileMap[currentFolderIdRef.current] = {
        ...currentFolder,
        childrenIds: [...currentFolder.childrenIds, newFileId],
      }
      return newFileMap
    })
  }
  // Function that will be called when user creates a new folder using the toolbar
  // button. That that we use incremental integer IDs for new folder, but this is
  // not a good practice in production! Instead, you should use something like UUIDs
  // or MD5 hashes for file paths.
  const createFolder = useCallback((folderName: string) => {
    const newFolderId = uniqueID()
    console.log('newfolder', fileMap[currentFolderIdRef.current])

    setFileMap((map) => {
      asyncPost({
        url: DirCreateUrl,
        data: { value: map[currentFolderIdRef.current].path + '/' + folderName },
      }).then(() => {
        setFileMap((currentFileMap) => {
          const newFileMap = { ...currentFileMap }
          const parent = newFileMap[currentFolderIdRef.current]
          newFileMap[newFolderId] = {
            id: newFolderId,
            name: folderName,
            isDir: true,
            path: parent.path + '/' + folderName,
            modDate: new Date(),
            parentId: currentFolderIdRef.current,
            childrenIds: [],
            childrenCount: 0,
          }

          // Update parent folder to reference the new folder.

          newFileMap[currentFolderIdRef.current] = {
            ...parent,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            childrenIds: [...parent.childrenIds!, newFolderId],
          }
          return newFileMap
        })
      })

      // Create the new folder

      return map
    })
  }, [])

  return {
    fileMap,
    currentFolderId,
    setCurrentFolderId,
    resetFileMap,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
  }
}

export const useFiles = (fileMap: CustomFileMap, currentFolderId: string): FileArray => {
  return useMemo(() => {
    const currentFolder = fileMap[currentFolderId]
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const childrenIds = currentFolder.childrenIds!
    const files = childrenIds.map((fileId: string) => fileMap[fileId])
    return files
  }, [currentFolderId, fileMap])
}

export const useFolderChain = (fileMap: CustomFileMap, currentFolderId: string): FileArray => {
  return useMemo(() => {
    const currentFolder = fileMap[currentFolderId]

    const folderChain = [currentFolder]

    let parentId = currentFolder.parentId
    while (parentId) {
      const parentFile = fileMap[parentId]
      if (parentFile) {
        folderChain.unshift(parentFile)
        parentId = parentFile.parentId
      } else {
        break
      }
    }

    return folderChain
  }, [currentFolderId, fileMap])
}

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

export type VFSProps = Partial<FileBrowserProps>
type DataVFSProps = VFSProps & { data: FsMap }

export const ServerVFSBrowser: React.FC<VFSProps> = React.memo((props) => {
  const [data, setData] = useState(null)
  const [run, state] = useFetchCustomFileMap()
  useEffect(() => {
    run()
  }, [])
  useEffect(() => {
    if (state.data) {
      setData(state.data)
    }
  }, [state])
  return data == null ? null : <VFSBrowser data={data as FsMap} {...props} />
})

export const VFSBrowser: React.FC<DataVFSProps> = React.memo((props) => {
  const {
    fileMap,
    currentFolderId,
    setCurrentFolderId,
    resetFileMap,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
  } = useCustomFileMap(props.data)
  const files = useFiles(fileMap, currentFolderId)
  const folderChain = useFolderChain(fileMap, currentFolderId)
  const handleFileAction = useFileActionHandler(
    setCurrentFolderId,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
  )
  //const fileActions = useMemo(() => [ChonkyActions.CreateFolder, ChonkyActions.DeleteFiles], [])
  // const thumbnailGenerator = useCallback(
  //   (file: FileData) => (file.thumbnailUrl ? `https://chonky.io${file.thumbnailUrl}` : null),
  //   [],
  // )
  const fileActions = React.useMemo(
    () => [
      ChonkyActions.CreateFolder, // Adds a button to the toolbar
      ChonkyActions.UploadFiles, // Adds a button
      ChonkyActions.DownloadFiles, // Adds a button
      ChonkyActions.CopyFiles, // Adds a button and a shortcut: Ctrl+C
      ChonkyActions.DeleteFiles, // Adds a button and a shortcut: Delete
    ],
    [],
  )
  return (
    <>
      <div style={{ height: 640 }}>
        <FullFileBrowser
          files={files}
          folderChain={folderChain}
          fileActions={fileActions}
          onFileAction={handleFileAction}
          {...props}
        />
      </div>
    </>
  )
})

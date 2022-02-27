import React, { useState, useCallback, useRef, useEffect } from 'react'
import FilePicker from 'src/views/components/widgets/FilePicker'
import { CustomFileData, FsMap } from './FsMap'
import * as Dialog from 'src/views/components/dialog/Index'
import { uniqueID } from 'src/lib/string'
import { asyncPost } from 'src/lib/api'
import { DirCreateUrl } from './constants'
// Hook that sets up our file map and defines functions used to mutate - `deleteFiles`,
// `moveFiles`, and so on.
export const useCustomFileMap = (data: FsMap) => {
  const { fileMap: baseFileMap, rootFolderId, bashPath } = data as FsMap
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
          const newChildrenIds = parent.childrenIds?.filter((id: string) => id !== file.id)
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
        const newSourceChildrenIds = source.childrenIds?.filter((id) => !moveFileIds.has(id))
        newFileMap[source.id] = {
          ...source,
          childrenIds: newSourceChildrenIds,
          childrenCount: newSourceChildrenIds.length,
        }

        // Add the files to their destination folder.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
      const _path = path[0] === '/' ? path : new URL(path).pathname
      Dialog.confirm(
        <FilePicker
          basePath={_path}
          onProcessFiles={(files) => {
            console.log('response data', files)
            appendFileNode(files)
          }}
        />,
      )
      return map
    })
  }, [])

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  const appendFileNode = (fileInfo: any) => {
    const { fileName, path, thumbnailUrl } = fileInfo
    setFileMap((fileMap) => {
      const newFileId = uniqueID()
      const newFileMap = { ...fileMap }
      const currentFolder = newFileMap[currentFolderIdRef.current]
      newFileMap[newFileId] = {
        id: newFileId,
        name: fileName,
        isDir: false,
        path,
        thumbnailUrl,
        modDate: new Date(),
        parentId: currentFolderIdRef.current,
      }
      const childrenIds = [...currentFolder.childrenIds, newFileId]
      newFileMap[currentFolderIdRef.current] = {
        ...currentFolder,
        childrenIds: childrenIds,
        childrenCount: childrenIds.length,
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
    bashPath,
    setCurrentFolderId,
    resetFileMap,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
  }
}

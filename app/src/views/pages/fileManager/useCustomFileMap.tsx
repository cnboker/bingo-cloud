import React, { useState, useCallback, useRef, useEffect } from 'react'
import FilePicker from 'src/views/components/widgets/FilePicker'
import { CustomFileData, FsMap } from './FsMap'
import * as Dialog from 'src/views/components/dialog/Index'
import { uniqueID } from 'src/lib/string'
import { asyncPost, asyncGet } from 'src/lib/api'
import { DirCreateUrl } from './constants'
import { useDispatch } from 'react-redux'
import { StatusBarType, statusBarUpdate } from 'src/statusBarReducer'
import R from './locale'
// Hook that sets up our file map and defines functions used to mutate - `deleteFiles`,
// `moveFiles`, and so on.
export const useCustomFileMap = (data: FsMap) => {
  //rootFolderId: 目录root's id
  //fileMap:目录数据{key:value},value结构参考https://chonky.io/docs/2.x/basics/files 中的FileData数据结构
  const { fileMap: baseFileMap, rootFolderId } = data as FsMap
  // Setup the React state for our file map and the current folder.
  const [fileMap, setFileMap] = useState(baseFileMap)
  const [currentFolderId, setCurrentFolderId] = useState(rootFolderId)
  const dispatch = useDispatch()

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
    //setFileMap((map) => {
    const path = getPath(currentFolderIdRef.current)
    console.log('upload bashpath', path)
    Dialog.confirm(
      <FilePicker
        basePath={path}
        onProcessFiles={(files: any) => {
          appendFileNode({ path: `/${path}/${files.fileName}`, ...files })
        }}
      />,
    )
    //return map
    //})
  }, [])

  const getPath = (curNodeId: string) => {
    const curNode = fileMap[curNodeId]
    const paths = []
    if (curNode.isDir && curNode.parentId !== '') {
      paths.push(curNode.name)
    }
    let lastNode = curNode
    while (lastNode.parentId) {
      lastNode = fileMap[lastNode.parentId]
      //不包含root
      if (lastNode.parentId !== '') {
        paths.push(lastNode.name)
      }
    }
    return paths.reverse().join('/')
  }
  //视频文件显示编码进度
  // progress {
  //   frames: 899,
  //   currentFps: 32,
  //   currentKbps: 2642.9,
  //   targetSize: 9087,
  //   timemark: '00:00:28.16',
  //   percent: 92.48251174094388
  // }
  const checkLongTask = (requestUrl: string, fileName: string, newFileId: string) => {
    if (!requestUrl) return
    asyncGet({ url: requestUrl })
      .then((res) => {
        //console.log('checklongtask', res.data)
        const { percent, error, filename } = res.data
        if (percent > 0) {
          dispatch(
            statusBarUpdate({
              message: R.videoEncodeTip.format(filename, percent.toFixed(2)),
              visible: true,
              type: StatusBarType.progressBar,
            }),
          )
        }
        let timer
        if (percent < 100 && !error && !timer) {
          timer = setTimeout(() => {
            checkLongTask(requestUrl, fileName, newFileId)
          }, 3000)
        } else {
          timer && clearTimeout(timer)
          if (!error) {
            dispatch(
              statusBarUpdate({
                message: R.videoEncodeDone.format(filename),
                visible: true,
                type: StatusBarType.message,
              }),
            )
          } else {
            dispatch(
              statusBarUpdate({
                message: R.videoEncodeError.format(error),
                visible: true,
                type: StatusBarType.alert,
              }),
            )
            removeFileNode(newFileId)
          }
        }
      })
      .catch((e) => {
        statusBarUpdate({
          message: R.videoEncodeError.format(fileName),
          visible: true,
          type: StatusBarType.alert,
        })
      })
  }

  const removeFileNode = (id: any) => {
    setFileMap((currentFileMap) => {
      const newFileMap = { ...currentFileMap }
      const curNode = newFileMap[id]
      delete newFileMap[id]
      if (curNode.parentId) {
        const parent = newFileMap[curNode.parentId]!
        const newChildrenIds = parent.childrenIds?.filter((id: string) => id !== curNode.id)
        newFileMap[curNode.parentId] = {
          ...parent,
          childrenIds: newChildrenIds,
          childrenCount: newChildrenIds.length,
        }
      }
      return newFileMap
    })
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  const appendFileNode = (fileInfo: any) => {
    //taskPercentRequestUrl:视频文件上传包含该属性,浏览器可以调用该地址获取编码进度
    const { fileName, taskPercentRequestUrl, thumbnailUrl, path } = fileInfo
    console.log('appendFileNode', fileInfo)
    const newFileId = uniqueID()
    checkLongTask(taskPercentRequestUrl, fileName, newFileId)
    setFileMap((fileMap) => {
      const newFileMap = { ...fileMap }
      const currentFolder = newFileMap[currentFolderIdRef.current]
      newFileMap[newFileId] = {
        id: newFileId,
        name: fileName,
        path,
        isDir: false,
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
    setCurrentFolderId,
    resetFileMap,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
    getPath,
  }
}

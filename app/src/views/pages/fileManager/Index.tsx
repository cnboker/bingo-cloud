import React, { useEffect, useMemo, useState } from 'react'
import {
  ChonkyActions,
  FileArray,
  FileBrowserProps,
  FullFileBrowser,
  useFilePicker,
  SelectFileList,
  FileActionHandler,
} from 'chonky'
import { setChonkyDefaults, ChonkyIconFA } from 'chonky'
import { useSelector, RootStateOrAny } from 'react-redux'
import { useAsyncCallback } from 'src/lib/asynchronous'
import { FileListUrl, PubUrl } from './constants'
import './patch.css'
import { asyncGet, asyncPost } from 'src/lib/api'
import { CustomFileMap, FsMap } from './FsMap'
import { useCustomFileMap } from './useCustomFileMap'
import { useFileActionHandler } from './useFileActionHandler'
import { MetaMap } from './MetaMap'
import { uniqueID } from 'src/lib/string'

setChonkyDefaults({ iconComponent: ChonkyIconFA })

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

export type VFSProps = Partial<FileBrowserProps>
type DataVFSProps = VFSProps & { data: FsMap }

export const ServerVFSBrowser: React.FC<VFSProps> = (props) => {
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
}

const fileActions = [
  ChonkyActions.CreateFolder, // Adds a button to the toolbar
  ChonkyActions.UploadFiles, // Adds a button
  ChonkyActions.DownloadFiles, // Adds a button
  ChonkyActions.CopyFiles, // Adds a button and a shortcut: Ctrl+C
  ChonkyActions.DeleteFiles, // Adds a button and a shortcut: Delete
]

export const VFSBrowser: React.FC<DataVFSProps> = (props) => {
  const securityReducer = useSelector((state: RootStateOrAny) => state.securityReducer)
  console.log('securityReducer', securityReducer)
  const {
    fileMap,
    currentFolderId,
    setCurrentFolderId,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
  } = useCustomFileMap(props.data)
  const { selectedFiles, handleAction: fileSelectAction, handleRemove } = useFilePicker()
  const files = useFiles(fileMap, currentFolderId)
  const folderChain = useFolderChain(fileMap, currentFolderId)
  const handleFileAction = useFileActionHandler(
    setCurrentFolderId,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
  )

  const actionCombiner = React.useCallback<FileActionHandler>((data) => {
    fileSelectAction(data)
    handleFileAction(data)
  }, [])

  const onPub = () => {
    console.log('pub...')
    const rootId = uniqueID()
    const imageListId = uniqueID()
    const metaMap: MetaMap = {
      rootId,
      map: {},
    }
    metaMap.map[rootId] = {
      tag: 'View',
      childrenIds: [imageListId],
    }
    metaMap.map[imageListId] = {
      tag: 'ImageList',
      urls: [
        'https://t7.baidu.com/it/u=1819248061,230866778&fm=193&f=GIF',
        'https://t7.baidu.com/it/u=963301259,1982396977&fm=193&f=GIF',
        'https://t7.baidu.com/it/u=2168645659,3174029352&fm=193&f=GIF',
        'https://t7.baidu.com/it/u=2531125946,3055766435&fm=193&f=GIF',
        'https://t7.baidu.com/it/u=1330338603,908538247&fm=193&f=GIF',
      ],
      duration: 5000,
      animation: 'vanish',
      childrenIds: [],
    }
    const clientIds = ['abc']
    asyncPost({
      url: PubUrl,
      data: {
        username: securityReducer.userName,
        entity: metaMap,
      },
    }).then((resp) => {
      console.log(resp)
      useMqttPub(clientIds, resp.data)
    })
  }

  return (
    <>
      <SelectFileList fileList={selectedFiles} onSubmit={onPub} onRemove={handleRemove} />
      <div style={{ height: 640 }}>
        <FullFileBrowser
          disableDefaultFileActions={true}
          files={files}
          folderChain={folderChain}
          fileActions={fileActions}
          onFileAction={actionCombiner}
          {...props}
        />
      </div>
    </>
  )
}
function useMqttPub(clientIds: string[], data: any) {
  throw new Error('Function not implemented.')
}


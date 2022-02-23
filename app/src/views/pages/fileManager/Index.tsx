import React, { useEffect, useMemo, useState, useRef } from 'react'
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
import { useSelector, RootStateOrAny, useDispatch } from 'react-redux'
import { useAsyncCallback } from 'src/lib/asynchronous'
import { FileListUrl, PubUrl } from './constants'
import './patch.css'
import { asyncGet, asyncPost } from 'src/lib/api'
import { CustomFileMap, FsMap } from './FsMap'
import { useCustomFileMap } from './useCustomFileMap'
import { useFileActionHandler } from './useFileActionHandler'
import { PubForms } from './pubComponents/Index'
import { requestDeviceList } from '../device/actions'
import { mqttPub } from './mqttPub'
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

export const useFiles = (
  bashPath: string,
  fileMap: CustomFileMap,
  currentFolderId: string,
): FileArray => {
  return useMemo(() => {
    const currentFolder = fileMap[currentFolderId]
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const childrenIds = currentFolder.childrenIds!
    const files = childrenIds.map((fileId: string) => {
      const fo = fileMap[fileId]
      if (fo.path[0] === '/') {
        fo.path = bashPath + fo.path
        if (fo.thumbnailUrl) {
          fo.thumbnailUrl = bashPath + fo.thumbnailUrl
        }
      }
      return fileMap[fileId]
    })
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
  const {
    fileMap,
    currentFolderId, //RootId
    bashPath,
    setCurrentFolderId,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
  } = useCustomFileMap(props.data)
  const { selectedFiles, handleAction: fileSelectAction, handleRemove } = useFilePicker()
  const files = useFiles(bashPath, fileMap, currentFolderId)
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
  const dispatch = useDispatch()
  const pubFormsRef = useRef(null)
  const deviceReduer = useSelector((state: RootStateOrAny) => state.deviceListReducer)

  useEffect(() => {
    //call getdeviceList
    dispatch(requestDeviceList(securityReducer.userName))
  }, [])

  const getFileType = (url: string) => {
    if (url.endsWith('.mp4')) {
      return 'image'
    } else if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
      return 'video'
    } else if (url.endsWith('.pge')) {
      return 'page'
    } else {
      // eslint-disable-next-line no-throw-literal
      throw 'not konw ext'
    }
  }

  const onPub = async () => {
    const pubRef = pubFormsRef.current
    const validated = pubRef.dataValidate()
    if (!validated) return validated
    const data = pubRef.formData()
    const { settings, deviceList, fileList } = data
    console.log('pub data...', data)

    const fileUrls = fileList.map((x: { path: string }) => x.path)
    const entity = {
      urls: fileUrls,
      sources: fileUrls.map((url: string) => {
        return {
          url,
          type: getFileType(url),
          poster: '',
        }
      }),
      duration: settings.duration * 1000,
      animation: settings.effect,
    }

    asyncPost({
      url: PubUrl,
      data: {
        username: securityReducer.userName,
        entity,
      },
    }).then((resp) => {
      console.log('return result', resp.data, deviceList, fileUrls)
      mqttPub(deviceList, [...fileUrls, ...resp.data])
    })
    return true
  }

  return (
    <>
      <SelectFileList onSubmit={onPub} fileList={selectedFiles}>
        <PubForms
          ref={pubFormsRef}
          fileList={selectedFiles}
          onRemove={handleRemove}
          deviceList={deviceReduer.map((x: any) => {
            return { name: `${x.name}(${x.deviceId})`, value: x.deviceId }
          })}
        />
      </SelectFileList>
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

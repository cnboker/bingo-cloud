import React, { useEffect, useMemo, useState, useRef } from 'react'
import {
  ChonkyActions,
  FileArray,
  FileBrowserProps,
  FullFileBrowser,
  FileActionHandler,
  FileData,
} from 'chonky'
import { useFilePicker } from './useFilePicker'
import { SelectFileList } from './SelectFileList'
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
import { contentPublish } from '../mqtt/mqttApi'
import { getLang } from 'src/lib/localize'
import cn18n from './cn18n'
import StatusBar from '../../../StatusBar'

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
  const currentFolder = fileMap[currentFolderId]
  const childrenIds = [...currentFolder.childrenIds!]
  return childrenIds.map((fileId: string) => {
    return fileMap[fileId]
  })
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

//远程获取目录
export const ServerVFSBrowser: React.FC<VFSProps> = (props) => {
  const [data, setData] = useState(null)
  //异步加载目录数据声明
  const [run, state] = useFetchCustomFileMap()
  useEffect(() => {
    //加载目录
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
  //ChonkyActions.CreateFolder, // Adds a button to the toolbar
  ChonkyActions.UploadFiles, // Adds a button
  ChonkyActions.DownloadFiles, // Adds a button
  //ChonkyActions.CopyFiles, // Adds a button and a shortcut: Ctrl+C
  ChonkyActions.DeleteFiles, // Adds a button and a shortcut: Delete
  ChonkyActions.SelectAllFiles,
  ChonkyActions.ClearSelection,
  ChonkyActions.SortFilesByName,
  ChonkyActions.SortFilesBySize,
  ChonkyActions.OpenFiles,
]

export const VFSBrowser: React.FC<DataVFSProps> = (props) => {
  const securityReducer = useSelector((state: RootStateOrAny) => state.securityReducer)
  const {
    fileMap,
    currentFolderId, //RootId
    setCurrentFolderId,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
    getPath,
  } = useCustomFileMap(props.data)
  const { selectedFiles, fileSelectAction, removeAction, onMovedown } = useFilePicker([])

  const filesAction = useFiles(fileMap, currentFolderId)
  const folderChain = useFolderChain(fileMap, currentFolderId)
  const handleFileAction = useFileActionHandler(
    setCurrentFolderId,
    deleteFiles,
    moveFiles,
    createFolder,
    uploadFiles,
    getPath,
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
      return 'video'
    } else if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
      return 'image'
    } else if (url.endsWith('.pge')) {
      return 'page'
    } else if (url.endsWith('.zip')) {
      return 'zip'
    } else {
      // eslint-disable-next-line no-throw-literal
      throw 'not konw ext'
    }
  }

  const onPub = async () => {
    const pubRef = pubFormsRef.current
    const validated = pubRef.validate()
    if (!validated) return validated
    const { settings, deviceList, selectedFiles } = pubRef.formData()
    console.log('selectFiles', selectedFiles)
    const fileUrls = selectedFiles.map((x: FileData) => x.path)
    const entity = {
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

    //check is zip file
    const zipFileUrl = fileUrls.find((x: string) => x.lastIndexOf('.zip') > 0)
    if (zipFileUrl) {
      contentPublish(deviceList, [zipFileUrl])
    } else {
      asyncPost({
        url: PubUrl,
        data: {
          username: securityReducer.userName,
          entity,
        },
      }).then((resp) => {
        console.log('return result', resp.data, deviceList, fileUrls)
        contentPublish(deviceList, [...fileUrls, ...resp.data])
      })
    }
    return true
  }

  const locale = getLang()
  const i18n = useMemo(() => (locale === 'zh-CN' ? cn18n : {}), [locale])

  return (
    <>
      <StatusBar />
      <SelectFileList onSubmit={onPub} selectFileCount={selectedFiles.length}>
        <PubForms
          ref={pubFormsRef}
          selectedFiles={selectedFiles}
          removeAction={removeAction}
          onMovedown={onMovedown}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          deviceList={deviceReduer.map((x: any) => {
            return { name: `${x.name}(${x.deviceId})`, value: x.deviceId }
          })}
        />
      </SelectFileList>
      <div style={{ height: 640 }}>
        <FullFileBrowser
          disableDefaultFileActions={true}
          files={filesAction}
          i18n={i18n}
          fileActions={fileActions}
          folderChain={folderChain}
          onFileAction={actionCombiner}
          {...props}
        ></FullFileBrowser>
      </div>
    </>
  )
}

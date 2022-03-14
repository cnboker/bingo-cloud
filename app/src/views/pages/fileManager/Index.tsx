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
import { mqttPub } from './mqttPub'
import { getLang } from 'src/lib/localize'
import cn18n from './cn18n'
import { useAsyncMemo } from 'use-async-memo'

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
  const appendBashPath = (path: string, thumbnailUrl: string) => {
    return new Promise((resolve, reject) => {
      let _path: string = path
      let _thumbnailUrl: string = thumbnailUrl
      if (path[0] === '/') {
        _path = bashPath + path
        if (thumbnailUrl) {
          _thumbnailUrl = bashPath + thumbnailUrl
          //如果是视频文件，需要做2次请求，第一次请求创建视频图片， 第二次请求视频图片的缩微图片
          if (_thumbnailUrl.indexOf('.mp4') !== -1) {
            fetch(_thumbnailUrl).then((res) => {
              res.text().then((url) => {
                resolve({ path: _path, thumbnailUrl: url })
              })
            })
          } else {
            resolve({ path: _path, thumbnailUrl: _thumbnailUrl })
          }
        } else {
          resolve({ path: _path, thumbnailUrl: _thumbnailUrl })
        }
      } else {
        resolve({ path: _path, thumbnailUrl: _thumbnailUrl })
      }
    })
  }

  return useAsyncMemo(async () => {
    const currentFolder = fileMap[currentFolderId]
    if (currentFolder.path[0] === '/') {
      fileMap[currentFolderId] = { ...currentFolder, path: bashPath + currentFolder.path }
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const childrenIds = [...currentFolder.childrenIds!]
    //childrenIds.push(currentFolderId)
    const promises = childrenIds.map((fileId: string) => {
      const fo = fileMap[fileId]
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      return appendBashPath(fo.path, fo.thumbnailUrl).then((result: any) => {
        return { ...fo, ...result } as FileData
      })
    })
    return await Promise.all(promises)
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
  //ChonkyActions.DownloadFiles, // Adds a button
  //ChonkyActions.CopyFiles, // Adds a button and a shortcut: Ctrl+C
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
  const [selectedFiles, setSelectedFiles] = useState<FileArray>([])
  const { handleAction: fileSelectAction } = useFilePicker({ selectedFiles, setSelectedFiles })
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
      return 'video'
    } else if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg')) {
      return 'image'
    } else if (url.endsWith('.pge')) {
      return 'page'
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

  const locale = getLang()
  const i18n = useMemo(() => (locale === 'zh-CN' ? cn18n : {}), [locale])

  return (
    <>
      <SelectFileList onSubmit={onPub} selectFileCount={selectedFiles.length}>
        <PubForms
          ref={pubFormsRef}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          deviceList={deviceReduer.map((x: any) => {
            return { name: `${x.name}(${x.deviceId})`, value: x.deviceId }
          })}
        />
      </SelectFileList>
      <div style={{ height: 640 }}>
        <FullFileBrowser
          disableDefaultFileActions={true}
          files={files}
          i18n={i18n}
          folderChain={folderChain}
          fileActions={fileActions}
          onFileAction={actionCombiner}
          {...props}
        />
      </div>
    </>
  )
}

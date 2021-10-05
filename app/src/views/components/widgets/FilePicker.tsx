import React, { useRef, useEffect } from 'react'

// Import React FilePond
import { FilePond, registerPlugin } from 'react-filepond'

// Import FilePond styles
import 'filepond/dist/filepond.min.css'
// Import the Image EXIF Orientation and Image Preview plugins
// Note: These need to be installed separately
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation'
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
import FilePondPluginImageCrop from 'filepond-plugin-image-crop'
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css'
import FilePondPluginFileRename from 'filepond-plugin-file-rename'
import { FilePondErrorDescription, FilePondFile } from 'filepond'

// Register the plugins
registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFileRename,
  FilePondPluginImageCrop,
)

type PickerProps = {
  basePath: string
  onProcessFiles: (file: string) => void
}
// Our app
const ImagePicker = ({ basePath, onProcessFiles }: PickerProps) => {
  const pond = useRef<any>(null)

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { access_token } = JSON.parse(localStorage.getItem('token')!)
  useEffect(() => {
    document.addEventListener('FilePond:pluginloaded', (e) => {
      console.log('FilePond plugin is ready for use', e)
    })
  }, [])

  function handleInit() {
    console.log('FilePond instance has initialised', pond)
    pond.current._pond.on('process-complete', () => {
      debugger
    })
  }

  return (
    <FilePond
      ref={pond}
      allowMultiple={true}
      allowReorder={true}
      accepted-file-types="image/jpeg, image/png"
      maxFiles={5}
      labelIdle='从桌面拖拉文件或 <span class="filepond--label-action">浏览文件</span>'
      server={{
        url: `${process.env.REACT_APP_FILE_URL}/api/server/upload`,
        headers: { Authorization: 'Bearer ' + access_token, basePath: basePath },
        load: (source, load, _error, _progress, _abort, _headers) => {
          const myRequest = new Request(source)
          fetch(myRequest)
            .then(function (response) {
              response.blob().then(function (myBlob) {
                load(myBlob)
              })
              console.log('response', response)
            })
            .catch((e) => {
              console.log(e)
            })
        },
      }}
      name="files"
      oninit={() => handleInit()}
      onaddfile={(_error: FilePondErrorDescription | null, _file: FilePondFile) => {
        //setFilename(Date.now().toString() + '.jpg')
      }}
      onprocessfile={(error: FilePondErrorDescription | null, _files: FilePondFile) => {
        if (error) {
          console.log('Oh no')
          return
        }
        if (onProcessFiles) onProcessFiles(JSON.parse(_files.serverId))
      }}
    />
  )
}

export default ImagePicker

import { ImageList, ImageListItem, ImageListItemBar, IconButton } from '@material-ui/core'
import { ArrowBackOutlined, ArrowForwardOutlined, DeleteOutline } from '@material-ui/icons'
import React, { forwardRef, useImperativeHandle } from 'react'
import { FileData } from 'chonky'
import { SelectedFilesProps } from '../useFilePicker'

export default forwardRef(({ selectedFiles, setSelectedFiles }: SelectedFilesProps, ref) => {
  useImperativeHandle(ref, () => ({}))

  const onRemove = (index: number) => {
    if (index !== -1) {
      selectedFiles.splice(index, 1)
      setSelectedFiles([...selectedFiles])
    }
    console.log('handleRemove index', index, selectedFiles)
  }

  const onMoveup = (item: FileData, index: number) => {
    if (index > 0) {
      const preNode = selectedFiles[index - 1]
      selectedFiles[index - 1] = item
      selectedFiles[index] = preNode
      setSelectedFiles([...selectedFiles])
    }
  }
  const onMovedown = (item: FileData, index: number) => {
    if (index < selectedFiles.length - 1) {
      const preNode = selectedFiles[index + 1]
      selectedFiles[index + 1] = item
      selectedFiles[index] = preNode
      setSelectedFiles([...selectedFiles])
    }
  }
  return (
    <ImageList cols={3} rowHeight={256}>
      {selectedFiles.map((item: FileData, index: number) => {
        return (
          <ImageListItem key={`key${index}`}>
            <img
              src={`${item?.thumbnailUrl}`}
              srcSet={`${item?.thumbnailUrl}`}
              alt={item?.name}
              loading="lazy"
            />
            <ImageListItemBar
              position="top"
              actionPosition="right"
              actionIcon={
                <IconButton
                  aria-label="right"
                  style={{ color: '#fff' }}
                  size="medium"
                  title="Move next"
                  onClick={() => onMovedown(item, index)}
                >
                  <ArrowForwardOutlined />
                </IconButton>
              }
            />
            <ImageListItemBar
              title={item?.name}
              position="bottom"
              actionPosition="right"
              actionIcon={
                <IconButton
                  aria-label="delete"
                  style={{ color: '#fff' }}
                  size="medium"
                  title="delete"
                  onClick={() => onRemove(index)}
                >
                  <DeleteOutline />
                </IconButton>
              }
            />
          </ImageListItem>
        )
      })}
    </ImageList>
  )
})

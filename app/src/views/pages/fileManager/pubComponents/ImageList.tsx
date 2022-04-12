import React from 'react'
import { ImageList, ImageListItem, ImageListItemBar, IconButton } from '@material-ui/core'
import { ArrowForwardOutlined, DeleteOutline } from '@material-ui/icons'
import { FileArray, FileData } from 'chonky'

export type ImageListProps = {
  selectedFiles: FileArray
  removeAction: (index: number) => void
  onMovedown: (item: FileData, index: number) => void
}

export default ({ selectedFiles, removeAction, onMovedown }: ImageListProps) => {
  return (
    <ImageList cols={6} rowHeight={128}>
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
                  onClick={() => removeAction(index)}
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
}

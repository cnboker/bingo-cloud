import { ImageList, ImageListItem, ImageListItemBar, IconButton } from '@material-ui/core'
import { DeleteOutline } from '@material-ui/icons'
import React, { forwardRef, memo, useImperativeHandle } from 'react'
import { FileArray, FileData } from 'chonky'

type ImageListProps = {
  fileList: FileArray
  onRemove: (item?: FileData) => void
}
export default memo(
  forwardRef((props: ImageListProps, ref) => {
    const { fileList, onRemove } = props
    useImperativeHandle(ref, () => ({
      getData() {
        return fileList
      },
    }))
    return (
      <ImageList cols={3} rowHeight={256}>
        {fileList?.map((item, index) => {
          return (
            <ImageListItem key={`key${index}`}>
              <img
                src={`${item?.thumbnailUrl}&w=128&fit=crop&auto=format`}
                srcSet={`${item?.thumbnailUrl}&w=128&fit=crop&auto=format&dpr=2 2x`}
                alt={item?.name}
                loading="lazy"
              />
              <ImageListItemBar
                title={item?.name}
                position="bottom"
                actionIcon={
                  <IconButton
                    aria-label="delete"
                    color="secondary"
                    size="medium"
                    title="delete"
                    onClick={() => onRemove(item)}
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
  }),
)

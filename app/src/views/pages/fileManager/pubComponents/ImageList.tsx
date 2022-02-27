import { ImageList, ImageListItem, ImageListItemBar, IconButton } from '@material-ui/core'
import { ArrowBack, ArrowForwardOutlined, DeleteOutline } from '@material-ui/icons'
import React, { forwardRef, memo, useImperativeHandle, useState } from 'react'
import { FileArray, FileData } from 'chonky'

type ImageListProps = {
  fileList: FileArray
  onRemove: (item?: FileData) => void
}
export default memo(
  forwardRef((props: ImageListProps, ref) => {
    const { fileList, onRemove } = props
    const [list, setList] = useState(fileList)
    useImperativeHandle(ref, () => ({
      getData() {
        return fileList
      },
    }))

    const onMoveup = (item: FileData, index: number) => {
      if (index > 0) {
        const preNode = fileList[index - 1]
        fileList[index - 1] = fileList[index]
        fileList[index] = preNode
        setList([...fileList])
      }
    }
    const onMovedown = (item: FileData, index: number) => {
      if (index < fileList.length - 1) {
        const preNode = fileList[index + 1]
        fileList[index + 1] = fileList[index]
        fileList[index] = preNode
        setList([...fileList])
      }
    }
    return (
      <ImageList cols={3} rowHeight={256}>
        {list.map((item, index) => {
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
                actionPosition="left"
                actionIcon={
                  <IconButton
                    aria-label="left"
                    color="secondary"
                    size="medium"
                    title="Move last"
                    onClick={() => onMoveup(item, index)}
                  >
                    <ArrowBack />
                  </IconButton>
                }
              />
              <ImageListItemBar
                position="top"
                actionPosition="right"
                actionIcon={
                  <IconButton
                    aria-label="right"
                    color="secondary"
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

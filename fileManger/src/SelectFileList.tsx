import React from "react";
import {
  DialogTitle,
  Dialog,
  DialogActions,
  DialogContent,
  Button,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
} from "@material-ui/core";
import { DeleteOutline } from "@material-ui/icons";
import { FileArray, FileData } from "./Index";
import { Box } from "@material-ui/core";
type SelectFileInfo = {
  fileList: FileArray;
  onSubmit: () => void;
  onRemove: (fileData: FileData) => void;
};

export const SelectFileList: React.FC<SelectFileInfo> = ({
  fileList,
  onSubmit,
  onRemove,
}) => {
  const [open, setOpen] = React.useState(false);
  const handleClose = () => {
    setOpen(false);
  };
  const handleClickOpen = () => {
    setOpen(true);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row-reverse",
        p: 1,
        m: 1,
        bgcolor: "background.paper",
      }}
    >
      <Button variant="contained" onClick={handleClickOpen}>
        待发布项{fileList.length}
      </Button>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth={true}>
        <DialogTitle>待发布素材列表</DialogTitle>
        <DialogContent>
          <ImageList cols={3} rowHeight={256}>
            {fileList.map((item, index) => {
              return (
                <ImageListItem key={`key${index}`}>
                  <img
                    src={`${item.thumbnailUrl}?w=248&fit=crop&auto=format`}
                    srcSet={`${item.thumbnailUrl}?w=248&fit=crop&auto=format&dpr=2 2x`}
                    alt={item.name}
                    loading="lazy"
                  />
                  <ImageListItemBar
                    title={item.name}
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
              );
            })}
          </ImageList>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>取消</Button>
          <Button
            onClick={() => {
              handleClose();
              onSubmit();
            }}
          >
            发布
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

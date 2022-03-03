import React, { useState } from "react";
import { ChonkyActions } from "./action-definitions";
import { FileActionHandler, FileArray } from "./Index";

export const useFilePicker = () => {
  const [selectedFiles, setSelectedFiles] = useState<FileArray>([]);
  //action事件处理函数
  const handleAction = React.useCallback<FileActionHandler>((data) => {
    console.log("actionHandle data", data);
    if (
      data.id === ChonkyActions.OpenFiles.id &&
      !data.payload.targetFile.isDir
    ) {
      let existed = selectedFiles.find(
        (x) => x.id === data.payload.targetFile.id
      );
      if (!existed) {
        selectedFiles.push(data.payload.targetFile);
      }
      setSelectedFiles([...selectedFiles]);
    }
  }, []);

  const handleRemove = (index) => {
    //var index = selectedFiles.indexOf(item);

    if (index > -1) {
      selectedFiles.splice(index, 1);
      setSelectedFiles([...selectedFiles]);
    }
    console.log("handleRemove index", index, selectedFiles);
  };

  return {
    selectedFiles,
    handleAction,
    handleRemove,
  };
};

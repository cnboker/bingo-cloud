import React from "react";
import { SelectFileList } from "./SelectFileList";
import {
  FullFileBrowser,
  ChonkyActions,
  defineFileAction,
  ChonkyIconName,
} from "./Index";
import { useFilePicker } from "./useFilePicker";
const fileActions = [
  ChonkyActions.CreateFolder, // Adds a button to the toolbar
  ChonkyActions.UploadFiles, // Adds a button
  ChonkyActions.DownloadFiles, // Adds a button
  ChonkyActions.CopyFiles, // Adds a button and a shortcut: Ctrl+C
  ChonkyActions.DeleteFiles, // Adds a button and a shortcut: Delete
];

export default () => {
  const files = [
    { id: "lht", name: "ff", isDir: true },
    {
      id: "mcd",
      name: "chonky-sphere-v1.png",
      thumbnailUrl:
        "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fup.enterdesk.com%2F2021%2Fedpic%2F0b%2F17%2F04%2F0b1704a9741f4e7ddd07939877dd3590_1.jpg&refer=http%3A%2F%2Fup.enterdesk.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=jpeg?sec=1643372784&t=fb7597c1b469e0a6ed7e4f4f46d0f21b",
    },
    {
      id: "mcd1",
      name: "chonky-sphere-v2.png",
      thumbnailUrl:
        "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fup.enterdesk.com%2Fedpic%2F5e%2F4e%2Ff0%2F5e4ef0e451852e0114d75eac14f60924.jpeg&refer=http%3A%2F%2Fup.enterdesk.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=jpeg?sec=1643372784&t=5b4448483ad4a6fe75feceae534b1bae",
    },
    {
      id: "mcd2",
      name: "chonky-sphere-v3.png",
      thumbnailUrl:
        "https://gimg2.baidu.com/image_search/src=http%3A%2F%2Fup.enterdesk.com%2Fedpic%2Fe8%2Fea%2F6b%2Fe8ea6b847337f93065011c9b7c84ac03.jpg&refer=http%3A%2F%2Fup.enterdesk.com&app=2002&size=f9999,10000&q=a80&n=0&g=0n&fmt=jpeg?sec=1643372784&t=613425c3671b8eecfc551050ec77e275",
    },
  ];
  const folderChain = [{ id: "xcv", name: "Demo", isDir: true }];
  //定义action
  const myCustomAction = defineFileAction({
    id: "mycustomAction",
    //文件选中才生效
    requiresSelection: true,
    hotkeys: ["ctrl+u"],
    button: {
      name: "myCustomAction",
      toolbar: true,
      contextMenu: true,
      icon: ChonkyIconName.trash,
    },
    /* ... */
  } as const);
  const myFileActions = [myCustomAction, ChonkyActions.UploadFiles];

  const { selectedFiles, handleAction, handleRemove } = useFilePicker();

  const onPub = async () => {
    console.log("pub...");
    return "";
  };

  return (
    <div style={{ height: 400 }}>
      <SelectFileList fileList={selectedFiles} onSubmit={onPub}>
        <div>test</div>
      </SelectFileList>
      <FullFileBrowser
        files={files}
        folderChain={folderChain}
        fileActions={myFileActions}
        onFileAction={handleAction}
      />
    </div>
  );
};

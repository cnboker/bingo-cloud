import * as React from "react";

import { FullFileBrowser,ChonkyActions } from "./Index";
const fileActions = [
  ChonkyActions.CreateFolder, // Adds a button to the toolbar
  ChonkyActions.UploadFiles, // Adds a button
  ChonkyActions.DownloadFiles, // Adds a button
  ChonkyActions.CopyFiles, // Adds a button and a shortcut: Ctrl+C
  ChonkyActions.DeleteFiles, // Adds a button and a shortcut: Delete
]
console.log('fileActions',fileActions)
const Example = () => {
  const files = [
    { id: "lht", name: "ff", isDir: true },
    {
      id: "mcd",
      name: "chonky-sphere-v2.png",
      thumbnailUrl: "https://chonky.io/chonky-sphere-v2.png",
    },
  ];
  const folderChain = [{ id: "xcv", name: "Demo", isDir: true }];

  return (
    <div style={{ height: 400 }}>
      <FullFileBrowser
        files={files}
        folderChain={folderChain}
        fileActions={fileActions}
        instanceId="test"
      />
    </div>
  );
};

export default Example;

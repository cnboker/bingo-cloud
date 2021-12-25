import * as React from "react";

import { FullFileBrowser } from "./Index";

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
        instanceId="test"
      />
    </div>
  );
};

export default Example;

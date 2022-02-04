import React from "react";

export default () => {
  return (
    <Playlist loop={true}>
      <ImageList duration={5000} effect="random">
        <Image src="#1" />
        <Image src="#2" />
      </ImageList>
      <VideoPlayer src=""></VideoPlayer>
      <Page></Page>
    </Playlist>
  );
};

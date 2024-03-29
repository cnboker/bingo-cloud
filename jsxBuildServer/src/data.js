exports.MetaMap1 = {
  rootId: "2t53z2qntj3",
  map: {
    "2t53z2qntj3": { tag: "Viewport", childrenIds: ["bedqmduoeu"] },
    bedqmduoeu: {
      tag: "ImageList",
      urls: [
        "http://file.dsliz.info/wwwroot/admin/7.jpeg",
        "http://file.dsliz.info/wwwroot/admin/5.jpeg",
        "http://file.dsliz.info/wwwroot/admin/1.jpeg",
        "http://file.dsliz.info/wwwroot/admin/3.jpeg",
        "http://file.dsliz.info/wwwroot/admin/2.jpeg",
      ],
      duration: 3000,
      animation: "slider",
      childrenIds: [],
    },
  },
};

exports.MetaMap = {
  rootId: "2t53z2qntj3",
  map: {
    "2t53z2qntj3": { tag: "Viewport", childrenIds: ["bed1", "bedqmduoeu"] },
    bedqmduoeu: {
      tag: "ImageList",
      urls: [
        "http://file.dsliz.info/wwwroot/admin/7.jpeg",
        "http://file.dsliz.info/wwwroot/admin/5.jpeg",
        "http://file.dsliz.info/wwwroot/admin/1.jpeg",
        "http://file.dsliz.info/wwwroot/admin/3.jpeg",
        "http://file.dsliz.info/wwwroot/admin/2.jpeg",
      ],
      duration: 3000,
      animation: "slider",
      childrenIds: [],
    },
    bed1: {
      tag: "VideoJS",
      playlist: [
        {
          sources: [
            {
              src: "http://file.dsliz.info/wwwroot/admin/2.mp4",
              type: "video/mp4",
            },
          ],
          poster: "",
        },
        {
          sources: [
            {
              src: "http://file.dsliz.info/wwwroot/admin/1.mp4",
              type: "video/mp4",
            },
          ],
          poster: "",
        },
      ],
    },
  },
};

// [
//   {
//     sources: [
//       {
//         src: "http://media.w3.org/2010/05/sintel/trailer.mp4",
//         type: "video/mp4",
//       },
//     ],
//     poster: "http://media.w3.org/2010/05/sintel/poster.png",
//   },
//   {
//     sources: [
//       {
//         src: "http://media.w3.org/2010/05/bunny/trailer.mp4",
//         type: "video/mp4",
//       },
//     ],
//     poster: "http://media.w3.org/2010/05/bunny/poster.png",
//   },
// ];

// exports.postData = {
//   urls: [
//     //"http://file.dsliz.info/admin/bbc.mp4",
//     //"http://file.dsliz.info/wwwroot/admin/3.webm",
//     // "http://file.dsliz.info/wwwroot/admin/7.jpeg",
//     // "http://file.dsliz.info/wwwroot/admin/5.jpeg",
//     // "http://file.dsliz.info/wwwroot/admin/1.jpeg",
//     // "http://file.dsliz.info/wwwroot/admin/3.jpeg",
//      "http://file.dsliz.info/admin/2.jpeg",
//     "http://file.dsliz.info/admin/2.mp4",
//   ],
//   duration: 3000,
//   animation: "slider",
// };

exports.postData = { 
  sources: [ 
    // { type: "image", url: "http://file.dsliz.info/admin/5.jpeg" },
    // { type: "image", url: "http://file.dsliz.info/admin/2.jpeg" },
    // { type: "image", url: "http://file.dsliz.info/admin/3.jpeg" },
   // { type: "video", url: "http://file.dsliz.info/video/4a.mp4", poster: "/" },
    { type: "image", url: "../1.jpg", poster: "/" },
    { type: "image", url: "../2.jpg", poster: "/" },
    { type: "image", url: "../3.jpeg", poster: "/" },
   
   // { type: "video", url: "http://file.dsliz.info/video/3.mp4", poster: "/" },
    // { type: "video", url: "http://file.dsliz.info/admin/videos/video.mp4", poster: "/" },
  ],
  duration: 3000,
  animation: "vanish",
};
 
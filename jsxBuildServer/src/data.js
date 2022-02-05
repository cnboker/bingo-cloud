
exports.MetaMap1 = {
  rootId: "2t53z2qntj3",
  map: {
    "2t53z2qntj3": { tag: "Viewport", childrenIds: ["bedqmduoeu"] },
    bedqmduoeu: {
      tag: "ImageList",
      urls: [
        "http://file.ioliz.com/wwwroot/admin/7.jpeg",
        "http://file.ioliz.com/wwwroot/admin/5.jpeg",
        "http://file.ioliz.com/wwwroot/admin/1.jpeg",
        "http://file.ioliz.com/wwwroot/admin/3.jpeg",
        "http://file.ioliz.com/wwwroot/admin/2.jpeg",
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
        "http://file.ioliz.com/wwwroot/admin/7.jpeg",
        "http://file.ioliz.com/wwwroot/admin/5.jpeg",
        "http://file.ioliz.com/wwwroot/admin/1.jpeg",
        "http://file.ioliz.com/wwwroot/admin/3.jpeg",
        "http://file.ioliz.com/wwwroot/admin/2.jpeg",
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
              src: "http://file.ioliz.com/wwwroot/admin/2.mp4",
              type: "video/mp4",
            },
          ],
          poster: "",
        },
        {
          sources: [
            {
              src: "http://file.ioliz.com/wwwroot/admin/1.mp4",
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

exports.postData = {
  urls: [
    //"http://file.ioliz.com/wwwroot/admin/2.mp4",
    "http://file.ioliz.com/wwwroot/admin/7.jpeg",
    "http://file.ioliz.com/wwwroot/admin/5.jpeg",
    "http://file.ioliz.com/wwwroot/admin/1.jpeg",
    "http://file.ioliz.com/wwwroot/admin/3.jpeg",
    "http://file.ioliz.com/wwwroot/admin/2.jpeg",
   // "http://file.ioliz.com/wwwroot/admin/1.mp4"
  ],
  duration: 3000,
  animation: "slider",
};

 
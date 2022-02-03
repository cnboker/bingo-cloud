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
      sources: [
        { src: "http://file.ioliz.com/wwwroot/admin/1.mp4", type: "video/mp4" },
      ],
    },
  },
};

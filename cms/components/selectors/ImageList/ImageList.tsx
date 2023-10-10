import React from 'react';
import { createStyles } from '@mui/material/styles';
import { makeStyles } from '@mui/styles';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';
import ImageListItemBar from '@mui/material/ImageListItemBar';
import IconButton from '@mui/material/IconButton';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { createTheme } from '@mui/material/styles';
const theme = createTheme();
const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper
  },
  imageList: {
    width: 500,
    height: 450,
    // Promote the list into its own layer in Chrome. This cost memory, but helps
    // keep FPS high.
    transform: 'translateZ(0)'
  },
  titleBar: {
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0' +
      ') 100%)'
  },
  icon: {
    color: 'white'
  }
}),);

const itemData = [
  {
    img: 'image',
    title: 'Image',
    author: 'author',
    featured: true
  }, {
    img: 'image',
    title: 'Image',
    author: 'author',
    featured: true
  }, {
    img: 'image',
    title: 'Image',
    author: 'author',
    featured: true
  }
];

/**
 * The example data is structured as follows:
 *
 * import image from 'path/to/image.jpg';
 * [etc...]
 *
 * const itemData = [
 *   {
 *     img: image,
 *     title: 'Image',
 *     author: 'author',
 *     featured: true,
 *   },
 *   {
 *     [etc...]
 *   },
 * ];
 */
export default function AdvImageList() {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <ImageList rowHeight={200} gap={1} className={classes.imageList}>
        {itemData.map((item) => (
          <ImageListItem
            key={item.img}
            cols={item.featured
              ? 2
              : 1}
            rows={item.featured
              ? 2
              : 1}>
            <img src={item.img} alt={item.title} />
            <ImageListItemBar
              title={item.title}
              position="top"
              actionIcon={< IconButton aria-label={
                `star ${item.title}`
              }
                className={
                  classes.icon
                } > <StarBorderIcon /> </IconButton>}
              actionPosition="left"
              className={classes.titleBar} />
          </ImageListItem>
        ))}
      </ImageList>
    </div>
  );
}
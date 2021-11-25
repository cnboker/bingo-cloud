import { useEditor } from '@craftjs/core';
import { Tooltip } from '@material-ui/core';
import cx from 'classnames';
import React from 'react';
import styled from 'styled-components';
import { Add, Remove, SettingsBackupRestore } from '@material-ui/icons'
import Checkmark from '../../../public/icons/check.svg';
import Customize from '../../../public/icons/customize.svg';
import RedoSvg from '../../../public/icons/toolbox/redo.svg';
import UndoSvg from '../../../public/icons/toolbox/undo.svg';
import Grid from '@material-ui/core/Grid'
import { Divider } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: {
    width: 'fit-content',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
    '& svg': {
      margin: theme.spacing(1.5),
    },
    '& hr': {
      margin: theme.spacing(0, 0.5),
    },
  },
}));

const HeaderDiv = styled.div`
  width: 100%;
  height: 45px;
  z-index: 99999;
  position: relative;
  padding: 0px 10px;
  background: #d4d4d4;
  display: flex;
`;

const Btn = styled.a`
  display: flex;
  align-items: center;
  padding: 5px 15px;
  border-radius: 3px;
  color: #fff;
  font-size: 13px;
  svg {
    margin-right: 6px;
    width: 12px;
    height: 12px;
    fill: #fff;
    opacity: 0.9;
  }
`;

const Item = styled.a<{ disabled?: boolean }>`
  margin-right: 10px;
  cursor: pointer;
  svg {
    width: 20px;
    height: 20px;
    fill: #707070;
  }
  ${(props) =>
    props.disabled &&
    `
    opacity:0.5;
    cursor: not-allowed;
  `}
`;

export const Header = ({ zoomIn, zoomOut, resetTransform }) => {
  const { enabled, canUndo, canRedo, actions } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));
  const classes = useStyles();
  return (
    <HeaderDiv className="header text-white transition w-full">
    
        {enabled && (<Grid container alignItems="flex-start" className={classes.root}>
          <Tooltip title="Undo" placement="bottom">
            <Item disabled={!canUndo} onClick={() => actions.history.undo()}>
              <UndoSvg />
            </Item>
          </Tooltip>
          <Tooltip title="Redo" placement="bottom">
            <Item disabled={!canRedo} onClick={() => actions.history.redo()}>
              <RedoSvg />
            </Item>
          </Tooltip>
          <Divider orientation="vertical" flexItem />
          <Tooltip title="zoomIn" placement="bottom">
            <Item onClick={() => zoomIn()}>
              <Add />
            </Item>
          </Tooltip>
          <Tooltip title="zoomOut" placement="bottom">
            <Item onClick={() => zoomOut()}>
              <Remove />
            </Item>
          </Tooltip>
          <Tooltip title="reset" placement="bottom">
            <Item onClick={() => resetTransform()}>
              <SettingsBackupRestore />
            </Item>
          </Tooltip>
        </Grid>)}

        <div className="flex">
          <Btn
            className={cx([
              'transition cursor-pointer',
              {
                'bg-green-400': enabled,
                'bg-primary': !enabled,
              },
            ])}
            onClick={() => {
              actions.setOptions((options) => (options.enabled = !enabled));
            }}
          >
            {enabled ? <Checkmark /> : <Customize />}
            {enabled ? 'Finish Editing' : 'Edit'}
          </Btn>
        </div>
      
    </HeaderDiv>
  );
};

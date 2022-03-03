import React, { useState } from "react";
import { IPlayProps } from "../Meta";
import { ISeamlessType, SeamLessPlayer } from "./SeamlessPlayer";

export const PlayList: React.FC<Array<IPlayProps>> = (props) => {
  const [index, setIndex] = useState({
    horsaIndex: 0,
    hengestIndex: 1,
    horsaShow: true,
    data: Object.values(props).map<IPlayProps>((x, index) => {
      return {
        ...x,
        autoPlay: index === 0,
        visible: index === 0
      }
    })
  })

  
  const seamlessProps: ISeamlessType = {
    horsaProps: index.data[index.horsaIndex],
    hengestProps: index.data[index.hengestIndex],
    next: () => {
      setIndex((last) => {
        const effectionReset =()=>{
          for(const item of data){
            item.visible = false;
            item.autoPlay = false;
          }
        }
        const { horsaIndex, hengestIndex, horsaShow, data } = last
        let _horsaIndex = horsaIndex, _hengestIndex = hengestIndex
        effectionReset()
        if (horsaShow) {
          _horsaIndex += 2
          if (_horsaIndex > data.length - 1) {
            _horsaIndex = 1
          }
          data[hengestIndex].label = "hengest" + hengestIndex
          data[hengestIndex].visible = true
          data[hengestIndex].autoPlay = true
        } else {
          _hengestIndex += 2
          if (_hengestIndex > data.length - 1) {
            _hengestIndex = 0
          }
          data[horsaIndex].label = "horsa" + horsaIndex
          data[horsaIndex].visible = true
          data[horsaIndex].autoPlay = true
        }

        return {
          horsaIndex: _horsaIndex,
          hengestIndex: _hengestIndex,
          horsaShow: !horsaShow,
          data
        }
      })
    }
  }


  return (
    <React.Fragment >
      <SeamLessPlayer {...seamlessProps} />
    </React.Fragment >
  )
}

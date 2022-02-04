import React from "react";
import { useNode } from "@craftjs/core";
import ContentEditable from 'react-contenteditable'
export const Text = ({ text, fontSize }) => {
  const {connectors:{connect, drag}} = useNode();
  return (
    <div ref={ref=>connect(drag(ref))}>
      <ContentEditable
        html={text} 
        onChange={e => 
          setProp(props => 
            props.text = e.target.value.replace(/<\/?[^>]+(>|$)/g, "")  
          )
        } 
        tagName="p"
        style={{fontSize: `${fontSize}px`}}
      />
    </div>
  );
};


import React, {useEffect} from "react";
import { Transition } from 'react-transition-group';

const duration = 300;
declare global {
  interface Window {
    animatelo:any
  }
}

const defaultStyle = {
  transition: `opacity ${duration}ms ease-in-out`,
  opacity: 0,
}

const transitionStyles = {
  entering: { opacity: 1 },
  entered:  { opacity: 1 },
  exiting:  { opacity: 0 },
  exited:  { opacity: 0 },
};

const Fade = ({ in: inProp }) => (
  <Transition in={inProp} timeout={duration}>
    {state => (
      <div style={{
        ...defaultStyle,
        ...transitionStyles[state]
      }}>
        I'm a fade Transition!
      </div>
    )}
  </Transition>
);


export const BB= () => {
  useEffect(() => {
    barbaInit()
  }, []);

  const barbaInit = ()=>{
    barba.init({
      debug: true,
      transitions: [
        {
          name: 'opacity-transition',
          sync: true,
          leave() {
            // create your stunning leave animation here
            console.log('leave')
            window
              .animatelo
              .fadeIn('#test');
          },
          async enter() {
            // create your amazing enter animation here
            console.log('enter..')
            window
              .animatelo
              .fadeOut('#test');
          } 
        }
      ]

    });
  }

  return (
    <div id="test">Hello World!! </div>
  )
};
